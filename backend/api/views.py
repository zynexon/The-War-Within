import logging
import quopri
from urllib.parse import parse_qs, quote, unquote, urlparse

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core import signing
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import GameSession, JournalEntry, PushSubscription, User, UserTask, XPLog
from .serializers import (
	AssignDailyTasksInputSerializer,
	CompleteTaskInputSerializer,
	DailyTasksQuerySerializer,
	EquipBadgeInputSerializer,
	GameStartInputSerializer,
	GameSubmitInputSerializer,
	GameXPInputSerializer,
	JournalEntryInputSerializer,
	JournalEntrySerializer,
	LeaderboardQuerySerializer,
	ForgotPasswordInputSerializer,
	PushSubscriptionSerializer,
	RegisterInputSerializer,
	ResetPasswordInputSerializer,
	UpdateFocusCategoryInputSerializer,
	UpdateNameInputSerializer,
	UserSerializer,
	UserTaskSerializer,
)
from .services import (
	award_shield_for_perfect_week,
	assign_daily_tasks,
	calculate_game_session_xp_for_type,
	check_and_award_daily_challenge,
	check_streak_on_login,
	create_xp_log,
	get_daily_challenge_status,
	get_daily_game_xp_cap,
	get_daily_game_remaining_by_type,
	get_daily_tasks,
	get_game_session,
	get_leaderboard,
	get_user_stats,
	grant_streak_shields,
	get_user_task,
	get_today_game_xp,
	increment_user_xp,
	seed_task_templates,
	get_weekly_war_report,
	update_streak,
	validate_game_duration,
	validate_game_score,
)


JOURNAL_DAILY_XP = 20
PASSWORD_RESET_SIGNING_SALT = "api.password-reset"
logger = logging.getLogger(__name__)


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


def decode_quoted_printable_value(value):
	if not value:
		return ""

	try:
		return quopri.decodestring(value.encode("utf-8")).decode("utf-8")
	except Exception:
		return value


def normalize_reset_token(raw_token):
	if not raw_token:
		return ""

	token = str(raw_token).strip().strip('"').strip("'")
	token = token.replace("\r", "").replace("\n", "")
	if not token:
		return ""

	token = decode_quoted_printable_value(token).strip()

	# Allow users to paste a full reset URL instead of just the token.
	try:
		parsed = urlparse(token)
		if parsed.scheme and parsed.netloc:
			query_token = parse_qs(parsed.query).get("reset_token", [""])[0]
			if query_token:
				token = query_token.strip()
	except Exception:
		pass

	if "reset_token=" in token:
		query_part = token.split("?", 1)[-1]
		query_token = parse_qs(query_part).get("reset_token", [""])[0]
		if query_token:
			token = query_token.strip()

	token = decode_quoted_printable_value(token).strip()

	# Common artifact when copying from quoted-printable console output.
	if token.startswith("3Dey"):
		token = token[2:]
	if token.startswith("=3D"):
		token = token[3:]
	if token.startswith("="):
		token = token[1:]

	return token.strip().strip('"').strip("'")


def load_reset_payload(token):
	clean_token = normalize_reset_token(token)
	candidates = []

	def add_candidate(value):
		if value and value not in candidates:
			candidates.append(value)

	add_candidate(clean_token)
	add_candidate(unquote(clean_token))
	add_candidate(decode_quoted_printable_value(clean_token))
	add_candidate(clean_token.replace(" ", "+"))

	for candidate in list(candidates):
		normalized = normalize_reset_token(candidate)
		add_candidate(normalized)
		add_candidate(unquote(normalized))
		add_candidate(decode_quoted_printable_value(normalized))
		add_candidate(normalized.replace(" ", "+"))
		if normalized.startswith("3D"):
			add_candidate(normalized[2:])
		if normalized.startswith("=3D"):
			add_candidate(normalized[3:])
		if normalized.startswith("="):
			add_candidate(normalized[1:])

	for candidate in candidates:
		if not candidate:
			continue
		try:
			payload = signing.loads(
				candidate,
				salt=PASSWORD_RESET_SIGNING_SALT,
				max_age=getattr(settings, "PASSWORD_RESET_TOKEN_MAX_AGE_SECONDS", 3600),
			)
			return payload
		except signing.SignatureExpired:
			raise
		except signing.BadSignature:
			continue

	raise signing.BadSignature("Invalid token.")


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
		assign_daily_tasks(user)

		return Response(
			{
				"success": True,
				"user": UserSerializer(user).data,
			},
			status=status.HTTP_201_CREATED,
		)


class ForgotPasswordView(APIView):
	permission_classes = [AllowAny]

	def post(self, request):
		serializer = ForgotPasswordInputSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		email = serializer.validated_data["email"].lower().strip()
		response_payload = {
			"success": True,
			"message": "If an account exists for this email, a reset link has been sent.",
		}

		user = User.objects.filter(email=email).first()
		if not user:
			return Response(response_payload)

		token = signing.dumps(
			{"uid": str(user.id), "pwd": user.password},
			salt=PASSWORD_RESET_SIGNING_SALT,
		)
		frontend_base_url = (getattr(settings, "FRONTEND_APP_URL", "") or "").rstrip("/")
		reset_url = f"{frontend_base_url}/?reset_token={quote(token, safe='')}" if frontend_base_url else ""

		subject = "Reset your Zynexon password"
		message_lines = [
			"You requested a password reset for your Zynexon account.",
			"",
		]
		if reset_url:
			message_lines.extend([
				"Use this link to set a new password:",
				reset_url,
			])
		else:
			message_lines.extend([
				"Use this reset token in the app:",
				token,
			])

		message_lines.extend([
			"",
			"If you did not request this, you can ignore this email.",
		])
		message = "\n".join(message_lines)

		try:
			send_mail(
				subject,
				message,
				getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@zynexon.app"),
				[email],
				fail_silently=False,
			)
		except Exception:
			logger.exception("Password reset email send failed for %s", email)

		email_backend = getattr(settings, "EMAIL_BACKEND", "")
		is_console_backend = email_backend.endswith("console.EmailBackend")
		if is_console_backend:
			# Dev convenience: frontend can auto-fill a guaranteed-valid token.
			response_payload["reset_token"] = token
			if reset_url:
				response_payload["reset_url"] = reset_url

		return Response(response_payload)


class ResetPasswordView(APIView):
	permission_classes = [AllowAny]

	def post(self, request):
		serializer = ResetPasswordInputSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		token = serializer.validated_data["token"]
		new_password = serializer.validated_data["password"]

		try:
			payload = load_reset_payload(token)
			user_id = payload.get("uid")
			password_snapshot = payload.get("pwd")
			if not user_id or not password_snapshot:
				raise signing.BadSignature("Malformed token payload.")

			user = User.objects.filter(id=user_id).first()
			if not user or user.password != password_snapshot:
				raise signing.BadSignature("Stale token.")
		except signing.SignatureExpired:
			return Response(
				{"error": "This reset link has expired. Request a new one."},
				status=status.HTTP_400_BAD_REQUEST,
			)
		except signing.BadSignature:
			return Response(
				{"error": "Invalid reset link. Request a new one."},
				status=status.HTTP_400_BAD_REQUEST,
			)

		try:
			validate_password(new_password, user=user)
		except DjangoValidationError as exc:
			messages = getattr(exc, "messages", None) or ["Password does not meet requirements."]
			return Response({"error": messages[0]}, status=status.HTTP_400_BAD_REQUEST)

		user.set_password(new_password)
		user.save(update_fields=["password"])

		return Response(
			{
				"success": True,
				"message": "Password reset successful. Please log in with your new password.",
			}
		)


class AuthMeView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		check_streak_on_login(request.user)
		user_data = UserSerializer(request.user).data
		user_data.update(get_user_stats(request.user))
		return Response(user_data)


class UserView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		check_streak_on_login(request.user)
		user_data = UserSerializer(request.user).data
		user_data.update(get_user_stats(request.user))
		return Response(user_data)


class EquipBadgeView(APIView):
	permission_classes = [IsAuthenticated]

	def patch(self, request):
		serializer = EquipBadgeInputSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		badge_id = serializer.validated_data.get("badge_id") or None
		request.user.equipped_badge = badge_id
		request.user.save(update_fields=["equipped_badge"])
		return Response({"equipped_badge": badge_id})


class UpdateNameView(APIView):
	permission_classes = [IsAuthenticated]

	def patch(self, request):
		serializer = UpdateNameInputSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		request.user.name = serializer.validated_data["name"]
		request.user.save(update_fields=["name"])
		user_data = UserSerializer(request.user).data
		user_data.update(get_user_stats(request.user))
		return Response(user_data)


class UpdateFocusCategoryView(APIView):
	permission_classes = [IsAuthenticated]

	@transaction.atomic
	def patch(self, request):
		serializer = UpdateFocusCategoryInputSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		new_category = serializer.validated_data["focus_category"]
		old_category = request.user.focus_category

		request.user.focus_category = new_category
		request.user.save(update_fields=["focus_category"])

		if old_category != new_category:
			today = timezone.localdate()
			UserTask.objects.filter(
				user=request.user,
				date=today,
				completed=False,
			).delete()
			assign_daily_tasks(request.user, today)

		user_data = UserSerializer(request.user).data
		user_data.update(get_user_stats(request.user))
		return Response(user_data)


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


class GameDailyRemainingView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		remaining_by_type = get_daily_game_remaining_by_type(request.user)
		return Response({"remaining_by_type": remaining_by_type})


class DailyChallengeView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		user = User.objects.get(id=request.user.id)
		daily_challenge = get_daily_challenge_status(user)
		return Response(
			{
				**daily_challenge,
				"total_xp": user.xp,
				"level": user.level,
				"streak_shields": user.streak_shields,
			}
		)


class WeeklyWarReportView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		report = get_weekly_war_report(request.user)
		return Response(report)


class PushSubscriptionView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request):
		serializer = PushSubscriptionSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		PushSubscription.objects.update_or_create(
			endpoint=serializer.validated_data["endpoint"],
			defaults={
				"user": request.user,
				"p256dh": serializer.validated_data["p256dh"],
				"auth": serializer.validated_data["auth"],
			},
		)

		return Response({"success": True}, status=status.HTTP_201_CREATED)

	def delete(self, request):
		endpoint = request.data.get("endpoint")
		if endpoint:
			PushSubscription.objects.filter(user=request.user, endpoint=endpoint).delete()
		return Response({"success": True})


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
		milestone_shields_awarded = 0
		war_mode_shields_awarded = 0

		if xp_awarded > 0:
			milestone_shields_awarded = increment_user_xp(user, xp_awarded)
			if session.game_type == "war_mode_full_war":
				war_mode_shields_awarded = grant_streak_shields(user, 1)
				if war_mode_shields_awarded > 0:
					user.save(update_fields=["streak_shields"])

		total_shields_awarded = milestone_shields_awarded + war_mode_shields_awarded

		create_xp_log(user, XPLog.SOURCE_GAME, xp_awarded)
		update_streak(user)
		daily_challenge = check_and_award_daily_challenge(user)
		daily_challenge_shields_awarded = daily_challenge.get("xp_milestone_shields_awarded", 0)
		total_shields_awarded += daily_challenge_shields_awarded

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
				"xp_milestone_shields_awarded": milestone_shields_awarded,
				"war_mode_shields_awarded": war_mode_shields_awarded,
				"daily_challenge_shields_awarded": daily_challenge_shields_awarded,
				"total_shields_awarded": total_shields_awarded,
				"daily_challenge_xp_awarded": daily_challenge.get("xp_awarded_now", 0),
				"daily_challenge": daily_challenge,
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

		daily_challenge = check_and_award_daily_challenge(user)

		return Response(
			{
				"entry": JournalEntrySerializer(entry).data,
				"xp_awarded": xp_awarded,
				"daily_cap": JOURNAL_DAILY_XP,
				"already_awarded_today": not created,
				"total_xp": user.xp,
				"level": user.level,
				"streak": user.streak,
				"daily_challenge_xp_awarded": daily_challenge.get("xp_awarded_now", 0),
				"daily_challenge": daily_challenge,
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
		user_task.completed_at = timezone.now()
		user_task.save(update_fields=["completed", "completed_at"])

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
		total_tasks_completed = user.user_tasks.filter(completed=True).count()
		daily_challenge = check_and_award_daily_challenge(user)
		daily_challenge_shields_awarded = daily_challenge.get("xp_milestone_shields_awarded", 0)
		total_shields_awarded += daily_challenge_shields_awarded

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
				"daily_challenge_shields_awarded": daily_challenge_shields_awarded,
				"total_shields_awarded": total_shields_awarded,
				"total_tasks_completed": total_tasks_completed,
				"daily_challenge_xp_awarded": daily_challenge.get("xp_awarded_now", 0),
				"daily_challenge": daily_challenge,
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
		milestone_shields_awarded = increment_user_xp(user, granted)
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
				"streak_shields": user.streak_shields,
				"xp_milestone_shields_awarded": milestone_shields_awarded,
				"total_shields_awarded": milestone_shields_awarded,
			},
			status=response_status,
		)


class LoginView(TokenObtainPairView):
	permission_classes = [AllowAny]


class RefreshTokenView(TokenRefreshView):
	permission_classes = [AllowAny]
