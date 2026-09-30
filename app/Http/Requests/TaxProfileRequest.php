<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TaxProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->user()->id;

        return [
            // Official PAN format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)
            'pan' => [
                'required', 'string', 'size:10',
                'regex:/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/',
                Rule::unique('tax_profiles', 'pan')->ignore($userId, 'user_id'),
            ],
            'date_of_birth' => ['required', 'date', 'before:-18 years'], // must be an adult
            'assessee_type' => ['required', Rule::in(['individual', 'huf', 'firm', 'company', 'other'])],
            'address_line1' => ['nullable', 'string', 'max:255'],
            'address_line2' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'pincode' => ['nullable', 'regex:/^[1-9][0-9]{5}$/'],
            'aadhaar_last4' => ['nullable', 'regex:/^[0-9]{4}$/'], // only last 4 digits ever stored
        ];
    }

    public function messages(): array
    {
        return [
            'pan.regex' => 'PAN must be in the format ABCDE1234F.',
            'pan.unique' => 'This PAN is already registered with another account.',
            'date_of_birth.before' => 'Taxpayer must be at least 18 years old (or use assessee type for guardianship cases).',
            'pincode.regex' => 'Enter a valid 6-digit PIN code.',
        ];
    }
}
