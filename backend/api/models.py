import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	email = models.EmailField(unique=True)
	xp = models.IntegerField(default=0)
	level = models.IntegerField(default=1)
	streak = models.IntegerField(default=0)
	last_active_date = models.DateField(null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)


class Task(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	title = models.CharField(max_length=255)
	xp = models.IntegerField()

	def __str__(self):
		return self.title


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
	SOURCE_CHOICES = [
		(SOURCE_TASK, "Task"),
		(SOURCE_GAME, "Game"),
	]

	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="xp_logs")
	source = models.CharField(max_length=20, choices=SOURCE_CHOICES)
	amount = models.IntegerField()
	created_at = models.DateTimeField(auto_now_add=True)
