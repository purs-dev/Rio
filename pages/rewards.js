// Loyalty page: points, code claim form, rewards, vouchers, and activity.
// Loaded by index.php; shared state and interactions live in website.js.

function rewards() {
    const points = Number(state.user?.points || 0);
    const next = state.rewards.find(r => Number(r.points) > points);
    return `<section class="wrap">${heading('The Rio regulars club', 'Rio rewards.', 'Your everyday coffee, with a little extra to look forward to.')}
        <div class="loyalty-layout"><div class="balance-card">
            <p class="eyebrow">${state.user ? `Good to see you, ${escapeHTML(state.user.name)}.` : 'There’s a place for you here.'}</p>
            <div class="balance">${points}<span>POINTS TO ENJOY</span></div><p>${next ? `${Number(next.points) - points} points to “${escapeHTML(next.name)}”.` : 'Every reward is within reach. Treat yourself.'}</p>
            <progress value="${Math.min(points, Number(next?.points || 200))}" max="${Number(next?.points || 200)}" aria-label="Progress toward next reward"></progress><span class="loyalty-wordmark">rio regulars.</span>
        </div><div class="claim-panel"><h2>Your cup.<br>Your next treat.</h2><p>Earn 1 point for every ₱10 paid after discounts. Enter the six-character code on your paid receipt to collect your points, once per order.</p>
            ${state.user ? '<form id="claim-form"><label for="loyalty-input">Your six-character receipt code</label><div class="claim-input"><input id="loyalty-input" name="code" maxlength="6" minlength="6" pattern="[A-Za-z0-9]{6}" placeholder="ABC123" required autocomplete="off"><button class="button" type="submit">Claim ↗</button></div><p class="form-error" role="alert"></p></form>' : '<button class="button" data-action="signup">Become a regular ↗</button><p class="small">Already one of us? <button class="text-link" data-action="signin">Sign in</button></p>'}
        </div></div>
        <div class="section-heading"><h2>Pick your treat.</h2><span class="muted">One voucher per order. No expiry.</span></div>
        <div class="reward-grid">${state.rewards.map(r => `<article class="reward-card"><span class="reward-value">${money(r.discount)}</span><span class="eyebrow">${r.points} points</span><h3>${escapeHTML(r.name)}</h3><p>${escapeHTML(r.description)}</p><button class="small-button" data-action="redeem" data-id="${r.id}" ${state.user && points < Number(r.points) ? 'disabled' : ''}>${!state.user ? 'Join to unlock' : points >= Number(r.points) ? 'Redeem your treat ↗' : `${Number(r.points) - points} points to go`}</button></article>`).join('')}</div>
        ${state.user ? `<div class="loyalty-records"><section><h2>Your vouchers.</h2>${state.vouchers.length ? state.vouchers.map(v => `<div class="voucher"><div><b>${escapeHTML(v.name)}</b><small>${v.code}</small></div><span>${v.used_at ? 'Used ✓' : `${money(v.discount)} off`}</span></div>`).join('') : '<p class="muted">Your redeemed treats will live here.</p>'}<p class="small">Select an available voucher at checkout. Unused value is not carried over.</p></section><section><h2>Your activity.</h2>${state.activity.length ? state.activity.map(a => `<div class="activity"><div>${escapeHTML(a.description)}<small>${escapeHTML(a.created_at)}</small></div><b>${Number(a.points) > 0 ? '+' : ''}${a.points}</b></div>`).join('') : '<p class="muted">Claim your first order code to start your story.</p>'}</section></div>` : ''}
    </section>`;
}

