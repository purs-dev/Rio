// Account page: sign-in invitation or signed-in membership dashboard.
// Loaded by index.php; shared state and interactions live in website.js.

function accountPage() {
    if (!state.user) {
        return `<section class="wrap account-page">${heading('Your little corner', 'Make yourself <em>at home.</em>', 'One account for your usual orders, your loyalty points, and the little treats in between.')}
            <div class="account-invite"><div class="invite-copy"><p class="eyebrow">The Rio regulars club</p><h2>Your seat is <em>waiting.</em></h2><p>Sign in to save your usual, follow your points, and keep every coffee run in one place. New around here? Make an account in under a minute.</p><div class="invite-actions"><button class="button" data-action="signin">Sign in <span>↗</span></button><button class="text-link" data-action="signup">Create an account <span>↗</span></button></div><div class="invite-perks"><span><b>01</b>Order ahead for pickup</span><span><b>02</b>Collect a point per ₱10</span><span><b>03</b>Turn points into treats</span></div></div><figure class="invite-photo"><img src="rio%20image/2.jpg" alt="Friends settled in together at Rio Street Coffee" loading="lazy"><figcaption>Good coffee. Good company.<br>A place that knows your name.</figcaption></figure></div>
        </section>`;
    }
    const points = Number(state.user.points || 0);
    const next = state.rewards.find(r => Number(r.points) > points);
    const target = Number(next?.points || Math.max(points, 1));
    return `<section class="wrap account-page">${heading('Your little corner', `Hello, <em>${escapeHTML(state.user.name.split(' ')[0])}.</em>`, 'Your usual, your points, and every coffee run in one place.')}
        <div class="account-dashboard"><article class="account-pass"><div class="account-pass-top"><span>Rio Street Coffee <b>Regulars</b></span><img src="rio%20image/LOGO.png" alt=""></div><div class="account-pass-body"><p class="eyebrow">Member</p><h2>${escapeHTML(state.user.name)}</h2><span>${escapeHTML(state.user.email)}</span></div><div class="account-pass-bottom"><div><strong>${points}</strong><span>points to enjoy</span></div><a href="#rewards" class="text-link">View treats <span>↗</span></a></div></article>
        <aside class="account-next"><p class="eyebrow">Up next</p><strong class="next-value">${next ? money(next.discount) : '✓'}</strong><h2>${next ? escapeHTML(next.name) : 'Every treat unlocked.'}</h2><p>${next ? `${Number(next.points) - points} points to go. Earn one point for every ₱10 paid after discounts.` : 'Choose your next little treat whenever you like. You have earned it.'}</p><progress value="${Math.min(points, target)}" max="${target}" aria-label="Progress toward your next reward"></progress><div class="next-meta"><span>${points} points</span><span>${next ? `${next.points} for this treat` : 'All yours'}</span></div><a href="#rewards" class="text-link">See your rewards <span>↗</span></a><div class="account-links"><a href="#menu" class="text-link">Order your usual <span>↗</span></a><button class="text-link" data-action="logout">Sign out <span>↗</span></button></div></aside></div>
        ${orderHistory()}
    </section>`;
}

