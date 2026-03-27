from django.urls import path

from .views import (
    AddGameXPView,
    AssignDailyTasksView,
    AuthMeView,
    CompleteTaskView,
    DailyTasksView,
    HelloView,
    LeaderboardView,
    LoginView,
    RefreshTokenView,
    RegisterView,
    SeedTasksView,
    UserView,
)

urlpatterns = [
    path("hello/", HelloView.as_view(), name="hello"),
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/refresh/", RefreshTokenView.as_view(), name="auth-refresh"),
    path("auth/me/", AuthMeView.as_view(), name="auth-me"),
    path("complete-task/", CompleteTaskView.as_view(), name="complete-task"),
    path("game-xp/", AddGameXPView.as_view(), name="game-xp"),
    path("user/", UserView.as_view(), name="user"),
    path("seed-tasks/", SeedTasksView.as_view(), name="seed-tasks"),
    path("assign-daily-tasks/", AssignDailyTasksView.as_view(), name="assign-daily-tasks"),
    path("daily-tasks/", DailyTasksView.as_view(), name="daily-tasks"),
    path("leaderboard/", LeaderboardView.as_view(), name="leaderboard"),
]
