<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Hook & Hunt - ERP</title>

    {{-- Load Vite HMR in development --}}
    @if(app()->environment('local'))
        @viteReactRefresh
        @vite(['resources/js/main.tsx'])
    @else
        {{-- Production: Load built assets from manifest --}}
        @php
            $manifest = json_decode(file_get_contents(public_path('build/manifest.json')), true);
            $entry = $manifest['resources/js/main.tsx'];
        @endphp

        @if(isset($entry['css']))
            @foreach($entry['css'] as $cssFile)
                <link rel="stylesheet" href="{{ asset('build/' . $cssFile) }}">
            @endforeach
        @endif

        <script type="module" defer src="{{ asset('build/' . $entry['file']) }}"></script>
    @endif
</head>
<body>
    <div id="root"></div>
</body>
</html>
