<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f3eddf">
    <meta name="description" content="Good coffee. Better company. Find your little corner at Rio Street Coffee, Sto. Rosario St., Angeles City. Explore the menu and order ahead for pickup.">
    <title>Rio Street Coffee — A little corner. A good cup.</title>
    <link rel="icon" href="rio%20image/LOGO.png">
    <link rel="preload" href="assets/fonts/bodoni-moda.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="assets/fonts/commissioner.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="style.css?v=10">
    <!-- Page layouts, followed by shared behavior. Deferred scripts run in this order. -->
    <script src="pages/home.js?v=10" defer></script>
    <script src="pages/story.js?v=10" defer></script>
    <script src="pages/menu.js?v=10" defer></script>
    <script src="pages/order.js?v=10" defer></script>
    <script src="pages/rewards.js?v=10" defer></script>
    <script src="pages/account.js?v=10" defer></script>
    <script src="website.js?v=10" defer></script>
</head>
<body>
    <div class="reading-progress" aria-hidden="true"></div>
    <div class="loader" id="loader" aria-hidden="true"><img src="rio%20image/LOGO.png" alt=""><span>A LITTLE PAUSE. A GOOD CUP.</span><i></i></div>
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="announcement"><span>YOUR NEIGHBORHOOD COFFEE SPOT</span><span>ANGELES CITY, PH <i>↗</i></span></div>
    <header class="site-header">
        <a href="#home" class="brand"><img src="rio%20image/LOGO.png" alt=""><span>rio street<span>COFFEE & GOOD COMPANY</span></span></a>
        <nav aria-label="Main navigation"><a href="#home" data-nav="home">Home</a><a href="#menu" data-nav="menu">The menu</a><a href="#story" data-nav="story">Our corner</a><a href="#rewards" data-nav="rewards">Rio rewards</a></nav>
        <div class="header-actions"><button class="account-link" id="account-button" data-action="account">Sign in <span>↗</span></button><a href="#order" class="bag-link">Your bag <span id="bag-count">0</span></a></div>
    </header>
    <div id="connection-error" class="connection-error" hidden></div>
    <main id="main" tabindex="-1"></main>
    <footer>
        <div class="footer-top"><a class="footer-brand" href="#home">See you at <em>Rio.</em> <span>↗</span></a><div><p class="eyebrow">COME ON UP</p><p>2F Lead Bldg., Sto. Rosario St.<br>Angeles City, Pampanga</p></div><div><p class="eyebrow">THERE’S TIME FOR A CUP</p><p>Mon–Sat · 9am–10pm<br>Sunday · 1pm–10pm</p></div></div>
        <div class="footer-bottom"><span>© <?= date('Y') ?> Rio Street Coffee</span><a href="assets/CREDITS.md">Photography & type credits</a><span>LOCAL ORDERING DEMO</span></div>
    </footer>
    <dialog id="modal" aria-labelledby="modal-title"><button class="modal-close" data-action="close-modal" aria-label="Close dialog">×</button><div id="modal-content"></div></dialog>
    <div id="toast" role="status" aria-live="polite"></div>
    <noscript><div class="noscript">Please enable JavaScript to browse the menu, sign in, and order. Visit us at 2F Lead Bldg., Sto. Rosario St., Angeles City.</div></noscript>
</body>
</html>
