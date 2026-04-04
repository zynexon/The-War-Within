from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import GameSession, JournalEntry, User, XPLog
from .serializers import (
	AssignDailyTasksInputSerializer,
	CompleteTaskInputSerializer,
	DailyTasksQuerySerializer,
	GameStartInputSerializer,
	GameSubmitInputSerializer,
	GameXPInputSerializer,
	JournalEntryInputSerializer,
	JournalEntrySerializer,
	LeaderboardQuerySerializer,
	RegisterInputSerializer,
	UpdateNameInputSerializer,
	UserSerializer,
	UserTaskSerializer,
)
from .services import (
	award_shield_for_perfect_week,
	assign_daily_tasks,
	calculate_game_session_xp_for_type,
	check_streak_on_login,
	create_xp_log,
	get_daily_game_xp_cap,
	get_daily_tasks,
	get_game_session,
	get_leaderboard,
	grant_streak_shields,
	get_user_task,
	get_today_game_xp,
	increment_user_xp,
	seed_task_templates,
	update_streak,
	validate_game_duration,
	validate_game_score,
)


JOURNAL_DAILY_XP = 5


def get_validation_error_message(exc, fallback="Request failed."):
	detail = getattr(exc, "detail", None)

	if isinstance(detail, list) and detail:
		return str(detail[0])

	if isinstance(detail, dict) and detail:
		first_value = next(iter(detail.values()))
		if isinstance(first_value, list) and first_value:
			return str(first_value[0])
		return str(first_value)

	if detail:
		return str(detail)

	return str(exc) if str(exc) else fallback


class HelloView(APIView):
	permission_classes = [AllowAny]

	def get(self, request):
		return Response(
			{
				"message": "Backend is live.",
				"stack": "Django + DRF + JWT",
			}
		)


class RegisterView(APIView):
	permission_classes = [AllowAny]

	@transaction.atomic
	def post(self, request):
		serializer = RegisterInputSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		name = serializer.validated_data["name"]
		email = serializer.validated_data["email"].lower().strip()
		password = serializer.validated_data["password"]

		if User.objects.filter(email=email).exists():
			return Response(
				{"error": "Email already registered."},
				status=status.HTTP_400_BAD_REQUEST,
			)

		user = User.objects.create_user(
			name=name,
			username=email,
			email=email,
			password=password,
			xp=0,
			level=1,
			streak=0,
		)
		seed_task_templates()
		assign_daily_tasks(user)

		return Response(
			{
				"success": True,
				"user": UserSerializer(user).data,
			},
			status=status.HTTP_201_CREATED,
		)


class AuthMeView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		check_streak_on_login(request.user)
		return Response(UserSerializer(request.user).data)


class UserView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		check_streak_on_login(request.user)
		return Response(UserSerializer(request.user).data)


class UpdateNameView(APIView):
	permission_classes = [IsAuthenticated]

	def patch(self, request):
		serializer = UpdateNameInputSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		request.user.name = serializer.validated_data["name"]
		request.user.save(update_fields=["name"])
		return Response(UserSerializer(request.user).data)


class SeedTasksView(APIView):
	permission_classes = [IsAuthenticated]

	@transaction.atomic
	def post(self, request):
		created = seed_task_templates()
		return Response(
			{
				"success": True,
				"created": created,
				"total_templates": 5,
			}
		)


class AssignDailyTasksView(APIView):
	permission_classes = [IsAuthenticated]

	@transaction.atomic
	def post(self, request):
		serializer = AssignDailyTasksInputSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		date = serializer.validated_data.get("date")
		assigned, created_count = assign_daily_tasks(request.user, date)
		return Response(
			{
				"success": True,
				"created_count": created_count,
				"tasks": UserTaskSerializer(assigned, many=True).data,
			}
		)


class DailyTasksView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		check_streak_on_login(request.user)
		serializer = DailyTasksQuerySerializer(data=request.query_params)
		serializer.is_valid(raise_exception=True)

		requested_user_id = serializer.validated_data.get("userId")
		if requested_user_id and requested_user_id != request.user.id:
			return Response(
				{"error": "You do not have permission to view another user's tasks."},
				status=status.HTTP_403_FORBIDDEN,
			)

		target_date = serializer.validated_data.get("date")
		assigned = get_daily_tasks(request.user, target_date)
		assigned = sorted(assigned, key=lambda item: item.task.title)
		return Response(UserTaskSerializer(assigned, many=True).data)


class GameStartView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request):
		serializer = GameStartInputSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		game_type = serializer.validated_data["game_type"]
		session = GameSession.objects.create(user=request.user, game_type=game_type)
		return Response(
			{"session_id": str(session.id), "game_type": session.game_type},
			status=status.HTTP_201_CREATED,
		)


class GameSubmitView(APIView):
	permission_classes = [IsAuthenticated]

	@transaction.atomic
	def post(self, request):
		serializer = GameSubmitInputSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		session = get_game_session(
			serializer.validated_data["session_id"],
			request.user,
			for_update=True,
		)

		if session.ended_at is not None:
			return Response(
				{"error": "This game session has already been submitted."},
				status=status.HTTP_400_BAD_REQUEST,
			)

		now = timezone.now()
		duration_seconds = (now - session.started_at).total_seconds()
		score = serializer.validated_data["score"]

		try:
			validate_game_duration(session.game_type, duration_seconds)
			validate_game_score(session.game_type, score)
		except ValidationError as exc:
			return Response(
				{"error": get_validation_error_message(exc, fallback="Invalid game submission.")},
				status=status.HTTP_400_BAD_REQUEST,
			)

		user = User.objects.select_for_update().get(id=request.user.id)
		check_streak_on_login(user)
		xp = calculate_game_session_xp_for_type(session.game_type, score)
		daily_cap = get_daily_game_xp_cap(session.game_type)

		if daily_cap is None:
			game_xp_today = 0
			remaining_today = None
			xp_awarded = xp
			capped_by_daily_limit = False
		else:
			game_xp_today = get_today_game_xp(user, session.game_type)
			remaining = daily_cap - game_xp_today
			xp_awarded = 0 if remaining <= 0 else min(xp, remaining)
			remaining_today = max(0, remaining - xp_awarded)
			capped_by_daily_limit = xp_awarded < xp

		session.ended_at = now
		session.score = score
		session.xp_awarded = xp_awarded
		session.save(update_fields=["ended_at", "score", "xp_awarded"])

		if xp_awarded > 0:
			increment_user_xp(user, xp_awarded)
			if session.game_type == "war_mode_full_war":
				grant_streak_shields(user, 1)
				user.save(update_fields=["streak_shields"])

		create_xp_log(user, XPLog.SOURCE_GAME, xp_awarded)
		update_streak(user)

		return Response(
			{
				"game_type": session.game_type,
				"score": score,
				"xp_calculated": xp,
				"xp_awarded": xp_awarded,
				"daily_cap": daily_cap,
				"today_game_xp_before": game_xp_today,
				"remaining_today": remaining_today,
				"capped_by_daily_limit": capped_by_daily_limit,
				"total_xp": user.xp,
				"level": user.level,
				"streak_shields": user.streak_shields,
			}
		)


class LeaderboardView(APIView):
	permission_classes = [AllowAny]

	def get(self, request):
		serializer = LeaderboardQuerySerializer(data=request.query_params)
		serializer.is_valid(raise_exception=True)

		limit = serializer.validated_data.get("limit", 20)
		period = serializer.validated_data.get("period", "weekly")
		current_user = request.user if request.user.is_authenticated else None
		entries, current_user_rank, total_users = get_leaderboard(current_user, limit, period)
		return Response(
			{
				"period": period,
				"total_users": total_users,
				"your_rank": current_user_rank["rank"] if current_user_rank else None,
				"top_users": entries,
				"entries": entries,
				"current_user_rank": current_user_rank,
			}
		)


class JournalView(APIView):
	permission_classes = [IsAuthenticated]
	JOURNAL_FIELD_MAP = {
		"did_you_win_today": "mood",
		"where_did_you_fail_yourself": "weather",
		"mental_state": "activity",
	}

	def get(self, request):
		today = timezone.localdate()
		entry = JournalEntry.objects.filter(user=request.user, date=today).first()

		if not entry:
			return Response({"entry": None})

		return Response({"entry": JournalEntrySerializer(entry).data})

	@transaction.atomic
	def post(self, request):
		serializer = JournalEntryInputSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		today = timezone.localdate()
		entry, created = JournalEntry.objects.get_or_create(
			user=request.user,
			date=today,
			defaults={
				"mood": "",
				"weather": "",
				"activity": "",
			},
		)

		for input_field, model_field in self.JOURNAL_FIELD_MAP.items():
			if input_field in serializer.validated_data:
				setattr(entry, model_field, serializer.validated_data[input_field])

		entry.save()

		user = User.objects.select_for_update().get(id=request.user.id)
		xp_awarded = 0
		if created:
			check_streak_on_login(user)
			xp_awarded = JOURNAL_DAILY_XP
			increment_user_xp(user, xp_awarded)
			create_xp_log(user, XPLog.SOURCE_JOURNAL, xp_awarded)
			update_streak(user)

		return Response(
			{
				"entry": JournalEntrySerializer(entry).data,
				"xp_awarded": xp_awarded,
				"daily_cap": JOURNAL_DAILY_XP,
				"already_awarded_today": not created,
				"total_xp": user.xp,
				"level": user.level,
				"streak": user.streak,
			}
		)


class CompleteTaskView(APIView):
	permission_classes = [IsAuthenticated]

	@transaction.atomic
	def post(self, request):
		serializer = CompleteTaskInputSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		user_task = get_user_task(serializer.validated_data["userTaskId"], for_update=True)
		if user_task.user_id != request.user.id:
			return Response(
				{"error": "You do not have permission to complete this task."},
				status=status.HTTP_403_FORBIDDEN,
			)

		if user_task.completed:
			return Response(
				{"error": "Task already completed."},
				status=status.HTTP_400_BAD_REQUEST,
			)

		xp_earned = user_task.task.xp
		target_date = user_task.date
		user_task.completed = True
		user_task.save(update_fields=["completed"])

		user = User.objects.select_for_update().get(id=request.user.id)
		check_streak_on_login(user)
		xp_milestone_shields = increment_user_xp(user, xp_earned)
		create_xp_log(user, XPLog.SOURCE_TASK, xp_earned)
		update_streak(user)

		perfect_week_shields = 0
		completed_today = user.user_tasks.filter(date=target_date, completed=True).count()
		if completed_today >= 5:
			perfect_week_shields = award_shield_for_perfect_week(user, target_date)
			if perfect_week_shields > 0:
				user.save(update_fields=["streak_shields", "last_perfect_week_shield_date"])

		total_shields_awarded = xp_milestone_shields + perfect_week_shields

		return Response(
			{
				"success": True,
				"xp_earned": xp_earned,
				"level": user.level,
				"streak": user.streak,
				"total_xp": user.xp,
				"streak_shields": user.streak_shields,
				"xp_milestone_shields_awarded": xp_milestone_shields,
				"perfect_week_shields_awarded": perfect_week_shields,
				"total_shields_awarded": total_shields_awarded,
			}
		)


class AddGameXPView(APIView):
	permission_classes = [IsAuthenticated]

	@transaction.atomic
	def post(self, request):
		serializer = GameXPInputSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		user = User.objects.select_for_update().get(id=request.user.id)
		check_streak_on_login(user)
		requested_xp = serializer.validated_data["xpEarned"]
		game_type = serializer.validated_data["game_type"]

		daily_cap = get_daily_game_xp_cap(game_type)
		game_xp_today = get_today_game_xp(user, game_type)
		remaining = daily_cap - game_xp_today
		if remaining <= 0:
			return Response(
				{"error": "Daily game XP cap reached.", "daily_cap": daily_cap, "game_type": game_type},
				status=status.HTTP_400_BAD_REQUEST,
			)

		granted = min(requested_xp, remaining)
		increment_user_xp(user, granted)
		create_xp_log(user, XPLog.SOURCE_GAME, granted)
		update_streak(user)

		response_status = status.HTTP_200_OK
		if granted < requested_xp:
			response_status = status.HTTP_206_PARTIAL_CONTENT

		return Response(
			{
				"success": True,
				"game_type": game_type,
				"xp_granted": granted,
				"requested_xp": requested_xp,
				"daily_cap": daily_cap,
				"remaining_today": max(0, remaining - granted),
				"level": user.level,
				"total_xp": user.xp,
				"streak": user.streak,
			},
			status=response_status,
		)


class LoginView(TokenObtainPairView):
	permission_classes = [AllowAny]


class RefreshTokenView(TokenRefreshView):
	permission_classes = [AllowAny]
