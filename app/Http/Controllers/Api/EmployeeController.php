<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\AgentRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
    /**
     * List all staff members (Admins & Employees) with their workload count.
     */
    public function index(Request $request)
    {
        $currentUser = $request->user();
        if ($currentUser->role !== 'admin' && $currentUser->role !== 'employee') {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized access.'], 403);
        }

        $staff = User::whereIn('role', ['admin', 'employee'])
            ->select('id', 'name', 'email', 'phone', 'role', 'created_at')
            ->withCount(['assignedAgentRequests as active_cases_count' => function ($query) {
                $query->whereIn('status', ['assigned', 'in_progress', 'under_review', 'prepared']);
            }])
            ->withCount(['assignedAgentRequests as completed_cases_count' => function ($query) {
                $query->where('status', 'completed');
            }])
            ->orderBy('id', 'asc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $staff,
        ]);
    }

    /**
     * Create a new staff member (Admin only).
     */
    public function store(Request $request)
    {
        $currentUser = $request->user();
        if ($currentUser->role !== 'admin') {
            return response()->json(['status' => 'error', 'message' => 'Only CA Admin can create new staff.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'role' => ['required', Rule::in(['admin', 'employee'])],
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'role' => $request->role,
            'password' => Hash::make($request->password),
        ]);

        \App\Services\AuditService::log(
            'STAFF_CREATED',
            $currentUser->id,
            null,
            'User',
            $user->id,
            null,
            ['name' => $user->name, 'email' => $user->email, 'role' => $user->role]
        );

        return response()->json([
            'status' => 'success',
            'message' => "Staff member {$user->name} created successfully.",
            'data' => $user,
        ], 201);
    }

    /**
     * Update an existing staff member (Admin only).
     */
    public function update(Request $request, $id)
    {
        $currentUser = $request->user();
        if ($currentUser->role !== 'admin') {
            return response()->json(['status' => 'error', 'message' => 'Only CA Admin can edit staff details.'], 403);
        }

        $user = User::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'phone' => 'nullable|string|max:20',
            'role' => ['required', Rule::in(['admin', 'employee'])],
            'password' => 'nullable|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $beforeState = [
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
        ];

        $user->name = $request->name;
        $user->email = $request->email;
        $user->phone = $request->phone;
        $user->role = $request->role;

        if ($request->filled('password')) {
            $user->password = Hash::make($request->password);
        }

        $user->save();

        \App\Services\AuditService::log(
            'STAFF_UPDATED',
            $currentUser->id,
            null,
            'User',
            $user->id,
            $beforeState,
            ['name' => $user->name, 'email' => $user->email, 'role' => $user->role]
        );

        return response()->json([
            'status' => 'success',
            'message' => "Staff member {$user->name} updated successfully.",
            'data' => $user,
        ]);
    }

    /**
     * Delete an existing staff member (Admin only).
     */
    public function destroy(Request $request, $id)
    {
        $currentUser = $request->user();
        if ($currentUser->role !== 'admin') {
            return response()->json(['status' => 'error', 'message' => 'Only CA Admin can remove staff members.'], 403);
        }

        if ((int) $id === (int) $currentUser->id) {
            return response()->json(['status' => 'error', 'message' => 'You cannot delete your own admin account.'], 400);
        }

        $user = User::findOrFail($id);

        // Unassign any open agent requests from this employee
        AgentRequest::where('assigned_employee_id', $user->id)
            ->whereIn('status', ['assigned', 'in_progress'])
            ->update([
                'assigned_employee_id' => null,
                'status' => 'pending',
            ]);

        $deletedName = $user->name;
        $user->delete();

        \App\Services\AuditService::log(
            'STAFF_DELETED',
            $currentUser->id,
            null,
            'User',
            (int) $id,
            ['name' => $deletedName],
            null
        );

        return response()->json([
            'status' => 'success',
            'message' => "Staff member {$deletedName} removed successfully.",
        ]);
    }
}
