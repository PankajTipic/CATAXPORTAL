<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>EWAREE Solutions LLP | Expert Switchgear Engineering</title>
    <meta name="description" content="EWAREE Solutions LLP - Expert Switchgear Engineering, Electrical Solutions and Industrial Services in Nashik, Maharashtra, India." />

    <?php
        $isLocalHost = in_array(request()->getHost(), ['localhost', '127.0.0.1', '::1']);
    ?>

    <?php if($isLocalHost && app()->environment('local') && !file_exists(public_path('build/manifest.json')) && !file_exists(public_path('build/.vite/manifest.json'))): ?>
        
        <?php
            $viteBase = env('VITE_DEV_URL', 'http://localhost:5173');
            $viteClient = rtrim($viteBase, '/') . '/' . '@vite/client';
            $viteEntry  = rtrim($viteBase, '/') . '/resources/react/main.tsx';
        ?>
        <script type="module" src="<?php echo e($viteClient); ?>"></script>
        <script type="module" src="<?php echo e($viteEntry); ?>"></script>
    <?php else: ?>
        
        <?php
            $possibleManifests = [
                public_path('build/.vite/manifest.json'),
                public_path('build/manifest.json'),
                base_path('public_html/build/.vite/manifest.json'),
                base_path('public_html/build/manifest.json'),
                base_path('public/build/.vite/manifest.json'),
                base_path('public/build/manifest.json'),
            ];

            $manifestPath = null;
            foreach ($possibleManifests as $path) {
                if ($path && file_exists($path) && is_file($path)) {
                    $manifestPath = $path;
                    break;
                }
            }

            $manifest = null;
            $entry = null;

            if ($manifestPath) {
                $content = @file_get_contents($manifestPath);
                if ($content !== false) {
                    $manifest = json_decode($content, true);
                    if ($manifest) {
                        $entry = $manifest['resources/react/main.tsx'] ?? (reset($manifest) ?: null);
                    }
                }
            }

            // Fallback: If manifest file is missing, find compiled main-*.js and main-*.css directly in build/assets
            if (!$entry) {
                $possibleBuildDirs = [
                    public_path('build/assets'),
                    base_path('public_html/build/assets'),
                    base_path('public/build/assets'),
                ];
                
                $buildDir = null;
                foreach ($possibleBuildDirs as $dir) {
                    if ($dir && is_dir($dir)) {
                        $buildDir = $dir;
                        break;
                    }
                }

                if ($buildDir) {
                    $jsFiles = glob($buildDir . '/*.js');
                    $cssFiles = glob($buildDir . '/*.css');
                    if (!empty($jsFiles)) {
                        $entry = [
                            'file' => 'assets/' . basename($jsFiles[0]),
                            'css'  => array_map(fn($f) => 'assets/' . basename($f), $cssFiles)
                        ];
                    }
                }
            }
        ?>

        <?php if($entry): ?>
            <?php if(isset($entry['css']) && is_array($entry['css'])): ?>
                <?php $__currentLoopData = $entry['css']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $css): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                    <link rel="stylesheet" href="/build/<?php echo e($css); ?>" />
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            <?php endif; ?>
            <?php if(isset($entry['file'])): ?>
                <script type="module" src="/build/<?php echo e($entry['file']); ?>"></script>
            <?php endif; ?>
        <?php endif; ?>
    <?php endif; ?>
</head>
<body>
    <div id="root"></div>
</body>
</html>
<?php /**PATH D:\Projects\ewaree\resources\views/app.blade.php ENDPATH**/ ?>