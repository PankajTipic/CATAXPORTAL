<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AgentRequest;
use App\Models\ChatMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class ChatMessageController extends Controller
{
    /**
     * Get chat messages for a specific agent request
     */
    public function index(Request $request, $requestId)
    {
        $user = $request->user();
        $agentRequest = AgentRequest::findOrFail($requestId);

        // Security check
        if ($user->role !== 'admin' && $agentRequest->user_id !== $user->id && $agentRequest->assigned_employee_id !== $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized access to chat.'], 403);
        }

        $messages = ChatMessage::with('sender:id,name,role')
            ->where('agent_request_id', $requestId)
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $messages,
        ]);
    }

    /**
     * Send a message in an agent request chat thread
     */
    public function store(Request $request, $requestId)
    {
        $user = $request->user();
        $agentRequest = AgentRequest::findOrFail($requestId);

        // Security check
        if ($user->role !== 'admin' && $agentRequest->user_id !== $user->id && $agentRequest->assigned_employee_id !== $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized access to chat.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'message' => 'required|string|max:5000',
            'attachment' => 'nullable|file|max:10240', // 10MB
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'message' => $validator->errors()->first()], 422);
        }

        $attachmentPath = null;
        if ($request->hasFile('attachment')) {
            $path = $request->file('attachment')->store("agent_files/chat/{$requestId}", 'public');
            $attachmentPath = Storage::disk('public')->url($path);
        }

        $message = ChatMessage::create([
            'agent_request_id' => $agentRequest->id,
            'sender_id' => $user->id,
            'message' => $request->message,
            'attachment_path' => $attachmentPath,
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $message->load('sender:id,name,role'),
        ], 201);
    }
}
