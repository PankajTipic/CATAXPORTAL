<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DocumentUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'assessment_year' => ['required', 'regex:/^[0-9]{4}-[0-9]{2}$/'], // e.g. 2026-27
            'type' => ['required', Rule::in(['form16', 'form26as', 'salary_slip', 'investment_proof', 'other'])],
            // Only allow PDF/JPEG/PNG, max 5MB, verified by real MIME sniffing not just extension
            'file' => [
                'required', 'file',
                'mimes:pdf,jpg,jpeg,png',
                'max:5120', // KB -> 5MB
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'assessment_year.regex' => 'Assessment year must be in format YYYY-YY, e.g. 2026-27.',
            'file.mimes' => 'Only PDF, JPG, or PNG files are allowed.',
            'file.max' => 'File must be smaller than 5MB.',
        ];
    }
}
