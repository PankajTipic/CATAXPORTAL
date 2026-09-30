<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ITR\ITRService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ITRController extends Controller
{
    protected ITRService $itrService;

    public function __construct(ITRService $itrService)
    {
        $this->itrService = $itrService;
    }

    /**
     * Verify PAN format and return taxpayer profile name.
     */
    public function verifyPan(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'pan' => ['required', 'string', 'regex:/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i'],
        ], [
            'pan.regex' => 'Please enter a valid 10-character PAN (e.g. ABCDE1234F).',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'validation_error',
                'valid' => false,
                'message' => $validator->errors()->first(),
            ], 422);
        }

        $result = $this->itrService->verifyPan($request->input('pan'));
        return response()->json($result);
    }

    /**
     * Check if PAN is registered on the Income Tax Portal.
     */
    public function checkRegistration(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'pan' => ['required', 'string', 'regex:/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i'],
        ], [
            'pan.regex' => 'Please enter a valid 10-character PAN (e.g. ABCDE1234F).',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'validation_error',
                'valid' => false,
                'message' => $validator->errors()->first(),
            ], 422);
        }

        $result = $this->itrService->checkRegistration($request->input('pan'));
        return response()->json($result);
    }

    /**
     * Authenticate with Income Tax PAN + Password and fetch all AIS/TDS/26AS/Form16 data.
     */
    public function loginAndFetch(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'pan' => ['required', 'string', 'regex:/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i'],
            'password' => ['required', 'string', 'min:4'],
            'assessment_year' => ['nullable', 'regex:/^[0-9]{4}-[0-9]{2}$/'],
        ], [
            'pan.regex' => 'Please enter a valid 10-character PAN number (e.g. ABCDE1234F).',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'validation_error',
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $ay = $request->input('assessment_year', '2026-27');
        $result = $this->itrService->loginAndFetchData(
            $request->input('pan'),
            $request->input('password'),
            $ay
        );

        if ($result['status'] === 'not_registered') {
            return response()->json($result, 404);
        }

        if ($result['status'] === 'invalid_credentials') {
            return response()->json($result, 401);
        }

        return response()->json($result, 200);
    }

    /**
     * Register customer directly on Income Tax Portal from within this application.
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'pan' => ['required', 'string', 'regex:/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['required', 'regex:/^[6-9][0-9]{9}$/'],
            'password' => ['required', 'string', 'min:6'],
            'dob' => ['nullable', 'date'],
        ], [
            'pan.regex' => 'Please enter a valid PAN (e.g. ABCDE1234F).',
            'phone.regex' => 'Please enter a valid 10-digit Indian mobile number.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'validation_error',
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $result = $this->itrService->registerOnITPortal($request->all());

        if ($result['status'] === 'already_registered') {
            return response()->json($result, 409);
        }

        return response()->json($result, 201);
    }

    /**
     * Retrieve all synchronized tax data for dashboard display.
     */
    public function getData(Request $request)
    {
        $ay = $request->query('assessment_year', '2026-27');
        $data = $this->itrService->getTaxData($request->user(), $ay);

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * Submit client's prepared ITR file to the Income Tax Portal.
     */
    public function submit(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'assessment_year' => ['nullable', 'regex:/^[0-9]{4}-[0-9]{2}$/'],
            'itr_form_type' => ['nullable', 'string'],
            'total_income' => ['nullable', 'numeric'],
            'total_tax_liability' => ['nullable', 'numeric'],
            'total_tds_claimed' => ['nullable', 'numeric'],
            'refund_or_payable' => ['nullable', 'numeric'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'validation_error',
                'message' => $validator->errors()->first(),
            ], 422);
        }

        $result = $this->itrService->submitReturn($request->user(), $request->all());

        return response()->json($result, 200);
    }
}
