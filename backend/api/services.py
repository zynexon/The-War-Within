import math

from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from .models import Task, User, UserTask, XPLog


MAX_DAILY_GAME_XP = 50
DEFAULT_TASK_TEMPLATES = [
    {"title": "Deep work: 45 minutes", "xp": 20},
    {"title": "No social scroll before noon", "xp": 15},
    {"title": "Workout or walk", "xp": 25},
    {"title": "Read 10 pages", "xp": 10},
    {"title": "Plan tomorrow in 5 mins", "xp": 10},
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


def get_today_game_xp(user):
    today = timezone.localdate()
    result = (
        XPLog.objects.filter(
            user=user,
            source=XPLog.SOURCE_GAME,
            created_at__date=today,
        ).aggregate(total=Sum("amount"))
    )
    return result["total"] or 0


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


def assign_daily_tasks(user, date=None):
    target_date = date or timezone.localdate()
    tasks = list(Task.objects.order_by("title")[:5])
    if not tasks:
        raise ValidationError("No task templates available. Seed tasks first.")

    assigned = []
    created_count = 0
    for task in tasks:
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
