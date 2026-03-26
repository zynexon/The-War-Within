from django.db import transaction
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import User, XPLog
from .serializers import (
	AssignDailyTasksInputSerializer,
	CompleteTaskInputSerializer,
	DailyTasksQuerySerializer,
	GameXPInputSerializer,
	RegisterInputSerializer,
	UserSerializer,
	UserTaskSerializer,
)
from .services import (
	MAX_DAILY_GAME_XP,
	assign_daily_tasks,
	create_xp_log,
	get_user_task,
	get_today_game_xp,
	increment_user_xp,
	seed_task_templates,
	update_streak,
)


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

		email = serializer.validated_data["email"].lower().strip()
		password = serializer.validated_data["password"]

		if User.objects.filter(email=email).exists():
			return Response(
				{"error": "Email already registered."},
				status=status.HTTP_400_BAD_REQUEST,
			)

		user = User.objects.create_user(
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
		return Response(UserSerializer(request.user).data)


class UserView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
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
		serializer = DailyTasksQuerySerializer(data=request.query_params)
		serializer.is_valid(raise_exception=True)

		target_date = serializer.validated_data.get("date")
		assigned, _ = assign_daily_tasks(request.user, target_date)
		assigned = sorted(assigned, key=lambda item: item.task.title)
		return Response(UserTaskSerializer(assigned, many=True).data)


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
		user_task.completed = True
		user_task.save(update_fields=["completed"])

		user = request.user
		increment_user_xp(user, xp_earned)
		create_xp_log(user, XPLog.SOURCE_TASK, xp_earned)
		update_streak(user)

		return Response(
			{
				"success": True,
				"xp_earned": xp_earned,
				"level": user.level,
				"streak": user.streak,
				"total_xp": user.xp,
			}
		)


class AddGameXPView(APIView):
	permission_classes = [IsAuthenticated]

	@transaction.atomic
	def post(self, request):
		serializer = GameXPInputSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		user = User.objects.select_for_update().get(id=request.user.id)
		requested_xp = serializer.validated_data["xpEarned"]

		game_xp_today = get_today_game_xp(user)
		remaining = MAX_DAILY_GAME_XP - game_xp_today
		if remaining <= 0:
			return Response(
				{"error": "Daily game XP cap reached.", "daily_cap": MAX_DAILY_GAME_XP},
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
				"xp_granted": granted,
				"requested_xp": requested_xp,
				"daily_cap": MAX_DAILY_GAME_XP,
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
