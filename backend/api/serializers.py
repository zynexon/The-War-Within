from rest_framework import serializers

from .models import User, UserTask


class CompleteTaskInputSerializer(serializers.Serializer):
    userTaskId = serializers.UUIDField()


class GameXPInputSerializer(serializers.Serializer):
    xpEarned = serializers.IntegerField(min_value=1)


class GameSubmitInputSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()
    score = serializers.IntegerField(min_value=0, max_value=60)


class AssignDailyTasksInputSerializer(serializers.Serializer):
    date = serializers.DateField(required=False)


class DailyTasksQuerySerializer(serializers.Serializer):
    userId = serializers.UUIDField(required=False)
    date = serializers.DateField(required=False)


class LeaderboardQuerySerializer(serializers.Serializer):
    limit = serializers.IntegerField(required=False, min_value=1, max_value=100, default=20)


class BootstrapUserInputSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)


class RegisterInputSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "xp", "level", "streak", "last_active_date", "created_at"]


class UserTaskSerializer(serializers.ModelSerializer):
    task_title = serializers.CharField(source="task.title", read_only=True)
    task_xp = serializers.IntegerField(source="task.xp", read_only=True)

    class Meta:
        model = UserTask
        fields = [
            "id",
            "task",
            "task_title",
            "task_xp",
            "date",
            "completed",
            "created_at",
        ]
