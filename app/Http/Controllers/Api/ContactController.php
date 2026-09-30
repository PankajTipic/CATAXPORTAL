<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    /**
     * Store a new contact form submission.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'    => 'required|string|max:255',
            'email'   => 'required|email|max:255',
            'subject' => 'nullable|string|max:500',
            'message' => 'nullable|string|max:5000',
        ]);

        $contact = Contact::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Your message has been sent successfully.',
            'data'    => $contact,
        ], 201);
    }

    /**
     * List all contact submissions (admin only).
     */
    public function index()
    {
        $contacts = Contact::orderBy('created_at', 'desc')->get();

        return response()->json($contacts);
    }

    /**
     * Delete a contact submission (admin only).
     */
    public function destroy($id)
    {
        $contact = Contact::findOrFail($id);
        $contact->delete();

        return response()->json([
            'success' => true,
            'message' => 'Contact entry deleted successfully.',
        ]);
    }
}
