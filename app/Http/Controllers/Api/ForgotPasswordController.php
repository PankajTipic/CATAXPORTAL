<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Carbon\Carbon;

class ForgotPasswordController extends Controller
{
    /**
     * Send a password reset OTP/link to the user's email.
     * Mirrors the Government ITR portal's "Forgot Password" flow.
     */
    public function sendResetLink(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            // Security: return success even for unknown emails (prevents enumeration)
            return response()->json([
                'status'  => 'success',
                'message' => 'If this email is registered, a password reset OTP has been sent.',
            ]);
        }

        // Generate a 6-digit OTP and a token
        $otp   = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
        $token = Str::random(64);

        // Store in password_reset_tokens table (standard Laravel table)
        DB::table('password_reset_tokens')->upsert([
            'email'      => $user->email,
            'token'      => Hash::make($otp . $token),   // hash OTP+token together
            'created_at' => now(),
        ], ['email']);

        // Store the plain token in a second column we can use to identify the session
        // We store otp_hint (plain OTP) for demo/log mode; in prod only send via email
        DB::table('password_reset_tokens')
            ->where('email', $user->email)
            ->update([
                'token'      => $otp . '::' . $token,   // plain storage for this demo app
                'created_at' => now(),
            ]);

        // Send email (uses configured mailer — 'log' in dev, SMTP in prod)
        $this->sendResetEmail($user, $otp, $token);

        Log::info("[ForgotPassword] Reset OTP sent to {$user->email}. OTP: {$otp}");

        return response()->json([
            'status'  => 'success',
            'message' => 'Password reset OTP sent to your registered email address.',
            'hint'    => app()->environment('local', 'staging') ? "Dev OTP: {$otp}" : null,
        ]);
    }

    /**
     * Verify OTP and reset the password.
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email'                 => 'required|email',
            'otp'                   => 'required|digits:6',
            'password'              => 'required|min:8|confirmed',
            'password_confirmation' => 'required',
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$record) {
            return response()->json([
                'status'  => 'error',
                'message' => 'No password reset request found for this email. Please request a new OTP.',
            ], 422);
        }

        // Check expiry (15 minutes)
        $createdAt = Carbon::parse($record->created_at);
        if ($createdAt->diffInMinutes(now()) > 15) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            return response()->json([
                'status'  => 'error',
                'message' => 'OTP has expired. Please request a new password reset.',
            ], 422);
        }

        // Verify OTP
        $stored = $record->token; // "123456::randomtoken"
        $parts  = explode('::', $stored, 2);
        $storedOtp = $parts[0] ?? '';

        if ($storedOtp !== $request->otp) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Invalid OTP. Please check the code sent to your email and try again.',
            ], 422);
        }

        // Update password
        $user = User::where('email', $request->email)->first();
        if (!$user) {
            return response()->json([
                'status'  => 'error',
                'message' => 'User account not found.',
            ], 404);
        }

        $user->password = Hash::make($request->password);
        $user->save();

        // Clean up the token
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        // Revoke all existing tokens for security
        $user->tokens()->delete();

        Log::info("[ForgotPassword] Password reset successfully for {$user->email}");

        return response()->json([
            'status'  => 'success',
            'message' => 'Your password has been reset successfully. You can now log in with your new password.',
        ]);
    }

    /**
     * Send password reset email using the configured mailer.
     */
    private function sendResetEmail(User $user, string $otp, string $token): void
    {
        $appName = config('app.name', 'TIQTAX');
        $fromAddress = config('mail.from.address', 'noreply@tiqtax.in');
        $fromName    = config('mail.from.name', $appName);

        try {
            Mail::raw(
                "Dear {$user->name},\n\n"
                . "You requested a password reset for your {$appName} account.\n\n"
                . "Your One-Time Password (OTP): {$otp}\n\n"
                . "This OTP is valid for 15 minutes only.\n\n"
                . "If you did not request this, please ignore this email.\n\n"
                . "Regards,\n{$appName} Team",
                function ($message) use ($user, $fromAddress, $fromName, $appName) {
                    $message->to($user->email, $user->name)
                            ->from($fromAddress, $fromName)
                            ->subject("{$appName} – Password Reset OTP");
                }
            );
        } catch (\Exception $e) {
            Log::error("[ForgotPassword] Failed to send email to {$user->email}: " . $e->getMessage());
        }
    }
}
