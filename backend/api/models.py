import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	name = models.CharField(max_length=100, null=True, blank=True)
	email = models.EmailField(unique=True)
	xp = models.IntegerField(default=0)
	level = models.IntegerField(default=1)
	streak = models.IntegerField(default=0)
	equipped_badge = models.CharField(max_length=50, null=True, blank=True)
	streak_shields = models.IntegerField(default=0)
	shield_used_today = models.BooleanField(default=False)
	last_perfect_week_shield_date = models.DateField(null=True, blank=True)
	last_active_date = models.DateField(null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)


class Task(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	title = models.CharField(max_length=255)
	xp = models.IntegerField()

	def __str__(self):
		return self.title


class DailyTaskSet(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	date = models.DateField(unique=True)
	tasks = models.ManyToManyField(Task, related_name="daily_sets")
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-date"]

	def __str__(self):
		return f"Daily tasks for {self.date}"


class UserTask(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="user_tasks")
	task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="user_tasks")
	date = models.DateField()
	completed = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		constraints = [
			models.UniqueConstraint(
				fields=["user", "task", "date"],
				name="unique_user_task_per_day",
			)
		]


class XPLog(models.Model):
	SOURCE_TASK = "task"
	SOURCE_GAME = "game"
	SOURCE_JOURNAL = "journal"
	SOURCE_CHOICES = [
		(SOURCE_TASK, "Task"),
		(SOURCE_GAME, "Game"),
		(SOURCE_JOURNAL, "Journal"),
	]

	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="xp_logs")
	source = models.CharField(max_length=20, choices=SOURCE_CHOICES)
	amount = models.IntegerField()
	created_at = models.DateTimeField(auto_now_add=True)


class GameSession(models.Model):
	TYPE_QUICK_MATH = "quick_math"
	TYPE_FOCUS_TAP = "focus_tap"
	TYPE_NUMBER_RECALL = "number_recall"
	TYPE_COLOR_COUNT_FOCUS = "color_count_focus"
	TYPE_SPEED_PATTERN = "speed_pattern"
	TYPE_REVERSE_ORDER = "reverse_order"
	TYPE_WAR_MODE_SKIRMISH = "war_mode_skirmish"
	TYPE_WAR_MODE_BATTLE = "war_mode_battle"
	TYPE_WAR_MODE_FULL_WAR = "war_mode_full_war"
	TYPE_CHOICES = [
		(TYPE_QUICK_MATH, "Quick Math"),
		(TYPE_FOCUS_TAP, "Focus Tap"),
		(TYPE_NUMBER_RECALL, "Number Recall"),
		(TYPE_COLOR_COUNT_FOCUS, "Color Count Focus"),
		(TYPE_SPEED_PATTERN, "Speed Pattern"),
		(TYPE_REVERSE_ORDER, "Reverse Order"),
		(TYPE_WAR_MODE_SKIRMISH, "War Mode Skirmish"),
		(TYPE_WAR_MODE_BATTLE, "War Mode Battle"),
		(TYPE_WAR_MODE_FULL_WAR, "War Mode Full War"),
	]

	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="game_sessions")
	game_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_QUICK_MATH)
	started_at = models.DateTimeField(auto_now_add=True)
	ended_at = models.DateTimeField(null=True, blank=True)
	score = models.IntegerField(default=0)
	xp_awarded = models.IntegerField(default=0)

	class Meta:
		ordering = ["-started_at"]


class JournalEntry(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="journal_entries")
	date = models.DateField()
	mood = models.CharField(max_length=50, blank=True, default="")
	weather = models.CharField(max_length=50, blank=True, default="")
	activity = models.CharField(max_length=50, blank=True, default="")
	productivity = models.CharField(max_length=50, blank=True, default="")
	social = models.CharField(max_length=50, blank=True, default="")
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		constraints = [
			models.UniqueConstraint(
				fields=["user", "date"],
				name="unique_user_journal_entry_per_day",
			)
		]
		ordering = ["-date", "-updated_at"]
