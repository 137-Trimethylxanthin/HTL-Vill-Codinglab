<script>
    import { page } from '$app/stores';

    let errorMessage = 'Unknown error';
    if ($page.error !== null) {
        errorMessage = $page.error.message;
    }
</script>

<h1>{$page.status}: {errorMessage}</h1>