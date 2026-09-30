<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class Form16Request extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'assessment_year' => ['required', 'regex:/^[0-9]{4}-[0-9]{2}$/'],
            'employer_name' => ['required', 'string', 'max:255'],
            'employer_tan' => ['nullable', 'regex:/^[A-Z]{4}[0-9]{5}[A-Z]{1}$/'], // official TAN format
            'gross_salary' => ['required', 'numeric', 'min:0', 'max:999999999'],
            'standard_deduction' => ['nullable', 'numeric', 'min:0', 'max:75000'], // current statutory cap
            'hra_exemption' => ['nullable', 'numeric', 'min:0'],
            'professional_tax' => ['nullable', 'numeric', 'min:0', 'max:2500'],
            'total_tds' => ['nullable', 'numeric', 'min:0'],
            'deduction_80c' => ['nullable', 'numeric', 'min:0', 'max:150000'], // statutory 80C cap
            'deduction_80d' => ['nullable', 'numeric', 'min:0', 'max:100000'],
        ];
    }

    public function messages(): array
    {
        return [
            'employer_tan.regex' => 'TAN must be in the format ABCD12345E.',
            'deduction_80c.max' => 'Section 80C deduction cannot exceed ₹1,50,000.',
            'standard_deduction.max' => 'Standard deduction cannot exceed the statutory limit of ₹75,000.',
        ];
    }
}
