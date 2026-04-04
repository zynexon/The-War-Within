from django.urls import path

from .views import (
    AssignDailyTasksView,
    AuthMeView,
    CompleteTaskView,
    DailyTasksView,
    EquipBadgeView,
    GameStartView,
    GameSubmitView,
    HelloView,
    JournalView,
    LeaderboardView,
    LoginView,
    RefreshTokenView,
    RegisterView,
    SeedTasksView,
    UpdateNameView,
    UserView,
)

urlpatterns = [
    path("hello/", HelloView.as_view(), name="hello"),
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/refresh/", RefreshTokenView.as_view(), name="auth-refresh"),
    path("auth/me/", AuthMeView.as_view(), name="auth-me"),
    path("game/start/", GameStartView.as_view(), name="game-start"),
    path("game/submit/", GameSubmitView.as_view(), name="game-submit"),
    path("complete-task/", CompleteTaskView.as_view(), name="complete-task"),
    path("user/", UserView.as_view(), name="user"),
    path("user/equip-badge/", EquipBadgeView.as_view(), name="equip-badge"),
    path("user/update-name/", UpdateNameView.as_view(), name="user-update-name"),
    path("seed-tasks/", SeedTasksView.as_view(), name="seed-tasks"),
    path("assign-daily-tasks/", AssignDailyTasksView.as_view(), name="assign-daily-tasks"),
    path("daily-tasks/", DailyTasksView.as_view(), name="daily-tasks"),
    path("journal/", JournalView.as_view(), name="journal"),
    path("leaderboard/", LeaderboardView.as_view(), name="leaderboard"),
]
