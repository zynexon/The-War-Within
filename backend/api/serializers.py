from rest_framework import serializers

from .models import JournalEntry, User, UserTask


class GameStartInputSerializer(serializers.Serializer):
    game_type = serializers.ChoiceField(
        choices=["quick_math", "focus_tap", "number_recall", "color_count_focus", "speed_pattern"],
        required=False,
        default="quick_math",
    )


class CompleteTaskInputSerializer(serializers.Serializer):
    userTaskId = serializers.UUIDField()


class GameXPInputSerializer(serializers.Serializer):
    xpEarned = serializers.IntegerField(min_value=1)
    game_type = serializers.ChoiceField(
        choices=["quick_math", "focus_tap", "number_recall", "color_count_focus", "speed_pattern"],
        required=False,
        default="quick_math",
    )


class GameSubmitInputSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()
    score = serializers.IntegerField(min_value=0, max_value=100)


class JournalEntryInputSerializer(serializers.Serializer):
    mood = serializers.CharField(required=False, allow_blank=True, max_length=50)
    weather = serializers.CharField(required=False, allow_blank=True, max_length=50)
    activity = serializers.CharField(required=False, allow_blank=True, max_length=50)
    productivity = serializers.CharField(required=False, allow_blank=True, max_length=50)
    social = serializers.CharField(required=False, allow_blank=True, max_length=50)


class JournalEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = JournalEntry
        fields = [
            "id",
            "date",
            "mood",
            "weather",
            "activity",
            "productivity",
            "social",
            "created_at",
            "updated_at",
        ]


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
    name = serializers.CharField(max_length=30)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)

    def validate_name(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Name cannot be empty.")
        return cleaned


class UpdateNameInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=30)

    def validate_name(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Name cannot be empty.")
        return cleaned


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "name", "email", "xp", "level", "streak", "last_active_date", "created_at"]


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
