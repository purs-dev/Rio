// Bag / checkout page and shared order history layout.
// Loaded by index.php; shared state and interactions live in website.js.

function cartLines() {
    return state.cart.map(item => ({...state.products.find(p => Number(p.id) === item.id), qty: item.qty})).filter(p => p.id);
}
function order() {
    const lines = cartLines();
    const total = lines.reduce((sum, p) => sum + p.price * p.qty, 0);
    const rows = lines.map(p => `<div class="cart-row">
        <div class="cup-icon" aria-hidden="true"><img src="${productPhoto(p.id).src}" alt=""></div>
        <div><h3>${escapeHTML(p.name)}</h3><p>${money(p.price)} · ${escapeHTML(p.category)}</p><button class="remove" data-action="remove" data-id="${p.id}">Remove</button></div>
        <div class="quantity"><button data-action="quantity" data-id="${p.id}" data-delta="-1" aria-label="Decrease ${escapeHTML(p.name)} quantity">−</button><span>${p.qty}</span><button data-action="quantity" data-id="${p.id}" data-delta="1" aria-label="Increase ${escapeHTML(p.name)} quantity" ${p.qty >= 20 ? 'disabled' : ''}>+</button></div><b>${money(p.price * p.qty)}</b>
    </div>`).join('');
    return `<section class="wrap">${heading('Your next coffee break', 'Your bag.', 'Order ahead. Come upstairs. Make yourself at home.')}
        <div class="checkout-layout"><div>${rows || '<div class="empty"><h2>Your next cup is waiting.</h2><p>Pick something good from the menu to get started.</p><a class="button" href="#menu">Explore the menu ↗</a></div>'}
            <a href="#menu" class="text-link continue-link">← A little something else?</a>
            <div class="pickup-note"><p class="eyebrow">Pickup at Rio</p><h3>2F Lead Bldg., Sto. Rosario St.</h3><p>Mon–Sat: 9am–10pm · Sun: 1pm–10pm<br>Demo orders can be placed anytime. Preparation is simulated.</p></div>
        </div><form id="checkout-form" class="order-summary">
            <h2>Your coffee run.</h2>
            <div class="summary-line"><span>Subtotal</span><b>${money(total)}</b></div><div class="summary-line"><span>Pickup</span><span>On the house</span></div>
            <label>Reward voucher<select name="voucher_id" id="checkout-voucher"><option value="">Save my perks for later</option>${state.vouchers.filter(v => !v.used_at).map(v => `<option value="${v.id}" data-discount="${v.discount}">${escapeHTML(v.name)} · ${money(v.discount)} off</option>`).join('')}</select></label>
            <div class="summary-line" id="discount-line" hidden><span>Regulars perk</span><b id="discount-amount"></b></div><div class="summary-total"><span>Total</span><strong id="checkout-total" data-subtotal="${total}">${money(total)}</strong></div>
            <p class="points-note" id="potential-points">Your receipt unlocks ${Math.floor(total / 10)} points.</p>
            <label>A note for your barista <span>(optional)</span><textarea name="notes" maxlength="300" rows="2" placeholder="Less ice? Anything we should know?"></textarea></label>
            <fieldset><legend>Choose a demo payment method</legend><div class="payment-options"><label><input type="radio" name="method" value="gcash" checked><span>GCash</span></label><label><input type="radio" name="method" value="maya"><span>Maya</span></label><label><input type="radio" name="method" value="card"><span>Card</span></label></div></fieldset>
            <p class="form-error" role="alert"></p><button class="button full" type="submit" ${!lines.length ? 'disabled' : ''}>${state.user ? 'Continue to payment' : 'Sign in to order'} <span>↗</span></button><small class="demo-note">SIMULATION ONLY · No real money is charged.<br>No card or wallet details are needed.</small>
        </form></div>${state.user ? orderHistory() : ''}</section>`;
}
function orderHistory() {
    return `<section class="history-section"><div class="section-heading"><div><p class="eyebrow">YOUR COFFEE RUNS</p><h2>At a <em>glance.</em></h2></div><button class="text-link" data-action="refresh">Refresh ↻</button></div>${state.orders.length ? state.orders.map(o => `<article class="history-order"><div class="history-order-top"><div><span class="eyebrow">RIO-${o.id} · ${escapeHTML(o.created_at)}</span><h3>${o.items.map(p => `${p.quantity} × ${escapeHTML(p.name)}`).join(', ')}</h3></div><b>${money(o.total)}</b></div><div class="order-meta"><span class="status ${o.payment_status === 'paid' ? 'paid' : ''}">${o.payment_status === 'paid' ? `PAID · ${escapeHTML(o.fulfillment)}` : escapeHTML(o.payment_status)}</span><span>${escapeHTML(o.payment_method.toUpperCase())} · DEMO</span>${o.notes ? `<span>Note: ${escapeHTML(o.notes)}</span>` : ''}</div>${o.payment_status === 'paid' ? `<div class="receipt-bottom"><div><small>YOUR LOYALTY CODE · ${o.earned_points} POINTS</small><strong class="loyalty-code">${o.loyalty_code}</strong></div>${o.claimed_at ? '<span class="claimed">✓ Points claimed</span>' : `<button class="text-link" data-action="claim" data-code="${o.loyalty_code}">Claim points ↗</button>`}${o.fulfillment !== 'collected' ? `<button class="small-button" data-action="advance" data-id="${o.id}">Demo: ${({placed: 'start preparing', preparing: 'mark ready', ready: 'collect order'})[o.fulfillment]} →</button>` : ''}</div>` : `<button class="text-link" data-action="resume-payment" data-id="${o.id}">Try demo payment ↗</button>`}</article>`).join('') : '<p class="muted">Your first coffee run will show up here.</p>'}</section>`;
}
