from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Task, User, UserTask, XPLog


@admin.register(User)
class UserAdmin(BaseUserAdmin):
	fieldsets = BaseUserAdmin.fieldsets + (
		(
			"Progression",
			{
				"fields": (
					"xp",
					"level",
					"streak",
					"last_active_date",
					"created_at",
				)
			},
		),
	)
	readonly_fields = ("created_at",)


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
	list_display = ("title", "xp")


@admin.register(UserTask)
class UserTaskAdmin(admin.ModelAdmin):
	list_display = ("user", "task", "date", "completed", "created_at")
	list_filter = ("date", "completed")


@admin.register(XPLog)
class XPLogAdmin(admin.ModelAdmin):
	list_display = ("user", "source", "amount", "created_at")
	list_filter = ("source", "created_at")
