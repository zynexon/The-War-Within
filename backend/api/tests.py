import json
from urllib.parse import quote

from django.contrib.auth import get_user_model
from django.core import mail, signing
from django.test import TestCase, override_settings
from django.urls import reverse

from .views import PASSWORD_RESET_SIGNING_SALT


class PasswordResetFlowTests(TestCase):
	def setUp(self):
		self.user_email = 'warrior@example.com'
		self.user_password = 'OldPass123!'
		self.user = get_user_model().objects.create_user(
			username=self.user_email,
			email=self.user_email,
			password=self.user_password,
			name='Warrior',
		)
		self.forgot_url = reverse('auth-forgot-password')
		self.reset_url = reverse('auth-reset-password')

	def _make_token(self):
		self.user.refresh_from_db()
		return signing.dumps(
			{'uid': str(self.user.id), 'pwd': self.user.password},
			salt=PASSWORD_RESET_SIGNING_SALT,
		)

	@override_settings(
		EMAIL_BACKEND='django.core.mail.backends.console.EmailBackend',
		FRONTEND_APP_URL='http://localhost:5173',
	)
	def test_forgot_password_returns_dev_token_with_console_backend(self):
		response = self.client.post(
			self.forgot_url,
			data=json.dumps({'email': self.user_email}),
			content_type='application/json',
		)

		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertTrue(payload.get('success'))
		self.assertIn('reset_token', payload)
		self.assertIn('reset_url', payload)

	@override_settings(
		EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
		FRONTEND_APP_URL='http://localhost:5173',
	)
	def test_forgot_password_sends_email_without_exposing_dev_token_on_non_console_backend(self):
		response = self.client.post(
			self.forgot_url,
			data=json.dumps({'email': self.user_email}),
			content_type='application/json',
		)

		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertTrue(payload.get('success'))
		self.assertNotIn('reset_token', payload)
		self.assertNotIn('reset_url', payload)

		self.assertEqual(len(mail.outbox), 1)
		self.assertIn(self.user_email, mail.outbox[0].to)
		self.assertIn('reset_token=', mail.outbox[0].body)

	@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
	def test_forgot_password_unknown_email_returns_generic_message(self):
		response = self.client.post(
			self.forgot_url,
			data=json.dumps({'email': 'missing@example.com'}),
			content_type='application/json',
		)

		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertEqual(
			payload.get('message'),
			'If an account exists for this email, a reset link has been sent.',
		)
		self.assertEqual(len(mail.outbox), 0)

	def test_reset_password_accepts_valid_token(self):
		token = self._make_token()
		new_password = 'NewPass123!'

		response = self.client.post(
			self.reset_url,
			data=json.dumps({'token': token, 'password': new_password}),
			content_type='application/json',
		)

		self.assertEqual(response.status_code, 200)
		self.user.refresh_from_db()
		self.assertTrue(self.user.check_password(new_password))
		self.assertFalse(self.user.check_password(self.user_password))

	def test_reset_password_rejects_invalid_token(self):
		response = self.client.post(
			self.reset_url,
			data=json.dumps({'token': 'invalid-token', 'password': 'AnotherPass123!'}),
			content_type='application/json',
		)

		self.assertEqual(response.status_code, 400)
		self.assertEqual(response.json().get('error'), 'Invalid reset link. Request a new one.')

	def test_reset_password_rejects_stale_token_after_password_change(self):
		token = self._make_token()
		self.user.set_password('ChangedBeforeReset123!')
		self.user.save(update_fields=['password'])

		response = self.client.post(
			self.reset_url,
			data=json.dumps({'token': token, 'password': 'AnotherPass123!'}),
			content_type='application/json',
		)

		self.assertEqual(response.status_code, 400)
		self.assertEqual(response.json().get('error'), 'Invalid reset link. Request a new one.')

	def test_reset_password_accepts_full_reset_url_and_quoted_printable_artifact_token(self):
		token = self._make_token()
		full_url = f'http://localhost:5173/?reset_token={quote(token, safe="")}'
		quoted_printable_artifact = f'3D{token}'

		response_url_token = self.client.post(
			self.reset_url,
			data=json.dumps({'token': full_url, 'password': 'UrlPass123!'}),
			content_type='application/json',
		)
		self.assertEqual(response_url_token.status_code, 200)

		self.user.refresh_from_db()
		token_after_first_reset = self._make_token()
		quoted_printable_artifact = f'3D{token_after_first_reset}'
		response_qp_token = self.client.post(
			self.reset_url,
			data=json.dumps({'token': quoted_printable_artifact, 'password': 'QpPass123!'}),
			content_type='application/json',
		)

		self.assertEqual(response_qp_token.status_code, 200)
		self.user.refresh_from_db()
		self.assertTrue(self.user.check_password('QpPass123!'))
