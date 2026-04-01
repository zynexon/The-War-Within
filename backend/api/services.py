import math
from datetime import date

from django.db.models import DateField
from django.db.models import Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from .models import DailyTaskSet, GameSession, Task, User, UserTask, XPLog


MAX_DAILY_GAME_XP = 50
MAX_DAILY_GAME_XP_BY_TYPE = {
    "quick_math": 50,
    "focus_tap": 50,
    "number_recall": 50,
    "color_count_focus": 60,
    "speed_pattern": 100,
}
DAILY_TASK_COUNT = 5
GAME_MIN_DURATION_SECONDS = 20
GAME_MAX_DURATION_SECONDS = 120
GAME_MIN_DURATION_SECONDS_BY_TYPE = {
    "quick_math": 20,
    "focus_tap": 5,
    "number_recall": 2,
    "color_count_focus": 6,
    "speed_pattern": 2,
}
GAME_MAX_DURATION_SECONDS_BY_TYPE = {
    "quick_math": 120,
    "focus_tap": 180,
    "number_recall": 180,
    "color_count_focus": 180,
    "speed_pattern": 300,
}
GAME_MAX_SCORE_BY_TYPE = {
    "quick_math": 60,
    "focus_tap": 15,
    "number_recall": 1,
    "color_count_focus": 8,
    "speed_pattern": 1,
}
FOCUS_TAP_WIN_SCORE = 15
NUMBER_RECALL_WIN_SCORE = 1
COLOR_COUNT_FOCUS_WIN_SCORE = 8
SPEED_PATTERN_WIN_SCORE = 1
GAME_XP_PER_SCORE = 2
GAME_XP_PER_SESSION_CAP = 30
DEFAULT_TASK_TEMPLATES = [
    {"title": "Deep work: 45 minutes", "xp": 20},
    {"title": "No social scroll before noon", "xp": 15},
    {"title": "Workout or walk", "xp": 25},
    {"title": "Read 10 pages", "xp": 10},
    {"title": "Plan tomorrow in 5 mins", "xp": 10},
    
    {"title": "Wake up before 7 AM", "xp": 15},
    {"title": "No phone for first 30 mins", "xp": 15},
    {"title": "Drink 2L of water", "xp": 10},
    {"title": "Meditate for 10 minutes", "xp": 15},
    {"title": "Write 5 key learnings today", "xp": 10},

    {"title": "Study/work 60 minutes distraction-free", "xp": 20},
    {"title": "Avoid junk food today", "xp": 15},
    {"title": "Do 50 push-ups (or equivalent)", "xp": 20},
    {"title": "Spend 15 mins learning something new", "xp": 10},
    {"title": "Clean your workspace", "xp": 10},

    {"title": "No social media after 9 PM", "xp": 15},
    {"title": "Track your expenses today", "xp": 10},
    {"title": "Have 1 meaningful conversation", "xp": 10},
    {"title": "Write your goals for the week", "xp": 15},
    {"title": "Sleep before 11 PM", "xp": 20},
]


def get_user(user_id):
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist as exc:
        raise NotFound("User not found.") from exc


def get_user_task(user_task_id, for_update=False):
    query = UserTask.objects.select_related("task", "user")
    if for_update:
        query = query.select_for_update()

    try:
        return query.get(id=user_task_id)
    except UserTask.DoesNotExist as exc:
        raise NotFound("User task not found.") from exc


def get_game_session(session_id, user, for_update=False):
    query = GameSession.objects.filter(id=session_id, user=user)
    if for_update:
        query = query.select_for_update()

    session = query.first()
    if not session:
        raise NotFound("Game session not found.")
    return session


def calculate_level(xp):
    return max(1, int(math.sqrt(max(0, xp) / 50)))


def increment_user_xp(user, amount):
    if amount <= 0:
        raise ValidationError("XP amount must be positive.")

    user.xp += amount
    user.level = calculate_level(user.xp)
    user.save(update_fields=["xp", "level"])
    return user


def create_xp_log(user, source, amount):
    return XPLog.objects.create(user=user, source=source, amount=amount)


def update_streak(user):
    today = timezone.localdate()
    yesterday = today - timezone.timedelta(days=1)

    if user.last_active_date == today:
        return user

    if user.last_active_date == yesterday:
        user.streak += 1
    else:
        user.streak = 1

    user.last_active_date = today
    user.save(update_fields=["streak", "last_active_date"])
    return user


def get_daily_game_xp_cap(game_type):
    cap = MAX_DAILY_GAME_XP_BY_TYPE.get(game_type)
    if cap is None:
        raise ValidationError("Invalid game type.")
    return cap


def get_today_game_xp(user, game_type):
    today = timezone.localdate()
    result = (
        GameSession.objects.filter(
            user=user,
            game_type=game_type,
            ended_at__date=today,
        ).aggregate(total=Sum("xp_awarded"))
    )
    return result["total"] or 0


def calculate_game_session_xp(score):
    return min(score * GAME_XP_PER_SCORE, GAME_XP_PER_SESSION_CAP)


def validate_game_score(game_type, score):
    max_score = GAME_MAX_SCORE_BY_TYPE.get(game_type)
    if max_score is None:
        raise ValidationError("Invalid game type.")

    if score < 0 or score > max_score:
        raise ValidationError("Invalid score submitted.")


def validate_game_duration(game_type, duration_seconds):
    min_duration = GAME_MIN_DURATION_SECONDS_BY_TYPE.get(game_type)
    max_duration = GAME_MAX_DURATION_SECONDS_BY_TYPE.get(game_type)

    if min_duration is None or max_duration is None:
        raise ValidationError("Invalid game type.")

    if duration_seconds < min_duration:
        raise ValidationError("Game submitted too quickly.")

    if duration_seconds > max_duration:
        raise ValidationError("Game session expired.")


def calculate_game_session_xp_for_type(game_type, score):
    if game_type == "focus_tap":
        return 10 if score >= FOCUS_TAP_WIN_SCORE else 0

    if game_type == "number_recall":
        return 10 if score >= NUMBER_RECALL_WIN_SCORE else 0

    if game_type == "color_count_focus":
        return 12 if score >= COLOR_COUNT_FOCUS_WIN_SCORE else 0

    if game_type == "speed_pattern":
        return 25 if score >= SPEED_PATTERN_WIN_SCORE else 0

    return calculate_game_session_xp(score)


def seed_task_templates():
    created_count = 0
    for template in DEFAULT_TASK_TEMPLATES:
        _, created = Task.objects.get_or_create(
            title=template["title"],
            defaults={"xp": template["xp"]},
        )
        if created:
            created_count += 1
    return created_count


def get_or_create_daily_task_set(target_date=None):
    """
    Get or create a DailyTaskSet for the given date.
    If it doesn't exist, randomly select DAILY_TASK_COUNT tasks.
    All users get the same tasks for a given day.
    """
    if target_date is None:
        target_date = timezone.localdate()

    daily_set, created = DailyTaskSet.objects.get_or_create(date=target_date)

    if created:
        available_tasks = list(Task.objects.order_by("?")[: DAILY_TASK_COUNT])
        if len(available_tasks) < DAILY_TASK_COUNT:
            raise ValidationError(
                f"Not enough tasks available. Need {DAILY_TASK_COUNT}, found {len(available_tasks)}."
            )
        daily_set.tasks.set(available_tasks)

    return daily_set


def assign_daily_tasks(user, date=None):
    """
    Assign today's global task set to a user.
    Uses get_or_create to avoid duplicates.
    """
    target_date = date or timezone.localdate()
    daily_set = get_or_create_daily_task_set(target_date)

    assigned = []
    created_count = 0
    for task in daily_set.tasks.all():
        user_task, created = UserTask.objects.get_or_create(
            user=user,
            task=task,
            date=target_date,
            defaults={"completed": False},
        )
        assigned.append(user_task)
        if created:
            created_count += 1

    return assigned, created_count


def get_daily_tasks(user, date=None):
    """
    Get tasks for a user on a given date.
    If tasks don't exist, assign them first.
    """
    target_date = date or timezone.localdate()
    
    user_tasks = UserTask.objects.filter(
        user=user,
        date=target_date,
    ).select_related("task")

    if not user_tasks.exists():
        assigned, _ = assign_daily_tasks(user, target_date)
        user_tasks = assigned
    else:
        user_tasks = list(user_tasks)

    return user_tasks


def get_leaderboard(current_user, limit=20):
    users = list(
        User.objects.annotate(
            recent_activity=Coalesce("last_active_date", date(1970, 1, 1), output_field=DateField()),
        )
        .order_by("-xp", "-streak", "-recent_activity", "created_at")
    )

    total_users = len(users)

    entries = []
    current_user_rank = None
    for index, user in enumerate(users, start=1):
        entry = {
            "rank": index,
            "user_id": str(user.id),
            "name": user.name,
            "email": user.email,
            "xp": user.xp,
            "level": user.level,
            "streak": user.streak,
            "last_active_date": user.last_active_date,
            "is_current_user": user.id == current_user.id,
        }

        if entry["is_current_user"]:
            current_user_rank = entry

        if len(entries) < limit:
            entries.append(entry)

    return entries, current_user_rank, total_users
