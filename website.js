'use strict';

// Shared browser behavior: navigation, shopping bag, sign-in, checkout, and motion.
// Page layouts are in pages/. Database requests go to server.php.

const $ = (selector, root = document) => root.querySelector(selector);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
const money = value => new Intl.NumberFormat('en-PH', {style: 'currency', currency: 'PHP', maximumFractionDigits: 0}).format(Number(value));
const state = {user: null, products: [], rewards: [], orders: [], vouchers: [], activity: [], cart: [], category: 'All', search: '', csrf: '', ready: false};
try {
    const saved = JSON.parse(localStorage.getItem('rio-bag') || '[]');
    if (Array.isArray(saved)) state.cart = saved.filter(item => Number.isInteger(item.id) && Number.isInteger(item.qty) && item.qty > 0 && item.qty <= 20);
} catch { /* A private or cleared browser starts with a fresh bag. */ }
let checkoutKey = null;
let toastTimer;
let routeVersion = 0;
let paymentOrder = null;
let activeCheckout = null;
try { activeCheckout = JSON.parse(sessionStorage.getItem('rio-active-checkout') || 'null'); } catch { /* Session storage is optional. */ }
const main = $('#main');
const modal = $('#modal');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const menuPhotos = {
    1: {src: 'rio%20image/3.jpg', alt: 'Rio iced latte in the afternoon light', credit: 'At Rio Street Coffee'},
    2: {src: 'assets/menu/americano.jpg', alt: 'Black coffee in a white cup', credit: 'Coffee study · sample photograph'},
    3: {src: 'assets/menu/latte.jpg', alt: 'Espresso and milk swirling over ice', credit: 'Coffee study · sample photograph'},
    4: {src: 'rio%20image/3.jpg', alt: 'Rio iced latte', credit: 'At Rio Street Coffee'},
    5: {src: 'assets/menu/chocolate.jpg', alt: 'A chocolate drink in a glass', credit: 'Chocolate study · sample photograph'},
    6: {src: 'assets/menu/matcha.jpg', alt: 'Green matcha latte in a ceramic cup', credit: 'Matcha study · sample photograph'},
    7: {src: 'assets/menu/chocolate.jpg', alt: 'A chocolate drink in a glass', credit: 'Chocolate study · sample photograph'},
    8: {src: 'assets/menu/strawberry.jpg', alt: 'A berry milkshake in a glass', credit: 'Berry study · sample photograph'},
    9: {src: 'assets/menu/croissant.jpg', alt: 'Golden croissants dusted with flour', credit: 'Pastry study · sample photograph'},
    10: {src: 'assets/menu/cookie.jpg', alt: 'Chocolate chunk cookies on parchment', credit: 'Pastry study · sample photograph'}
};
const productPhoto = id => menuPhotos[id] || menuPhotos[1];
let revealObserver;
let scrollFrame = 0;
let renderedPage = '';
let pageAnimation;
let scrollSurfaces = [];
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const magneticTargets = '.button, .small-button, .add-button, .bag-link, .text-link, .account-link, .site-header nav a, .tabs button';

function updateScrollScene() {
    scrollFrame = 0;
    const available = document.documentElement.scrollHeight - innerHeight;
    document.documentElement.style.setProperty('--reading-progress', available > 0 ? scrollY / available : 0);
    document.body.classList.toggle('has-scrolled', scrollY > 30);
    if (reducedMotion.matches) return;
    // Measure before writing styles; no scroll interception or layout changes.
    const arrivals = scrollSurfaces.map(element => {
        const bounds = element.getBoundingClientRect();
        return Math.max(0, Math.min(1, (innerHeight - bounds.top) / (innerHeight * .8)));
    });
    scrollSurfaces.forEach((element, index) => {
        element.style.setProperty('--arrival', arrivals[index].toFixed(3));
    });
    const scene = $('.slow-scene');
    if (scene) {
        const bounds = scene.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, -bounds.top / Math.max(1, bounds.height - innerHeight)));
        scene.style.setProperty('--scene-progress', progress);
    }
    const hero = $('.hero');
    if (hero) {
        const bounds = hero.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, -bounds.top / bounds.height));
        hero.style.setProperty('--hero-travel', `${progress * 65}px`);
    }
}
window.addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScrollScene);
}, {passive: true});
window.addEventListener('resize', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScrollScene);
}, {passive: true});

function prepareMotion() {
    revealObserver?.disconnect();
    scrollSurfaces = [...main.querySelectorAll('.space-photo, .story-pair img, .membership-card')];
    updateScrollScene();
    if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
    revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const element = entry.target;
            const isPhoto = element.matches('figure, .hero-visual, .story-grid > img');
            element.animate(isPhoto
                ? [{opacity: .4, transform: 'translateY(38px) scale(.94)'}, {opacity: 1, transform: 'none'}]
                : [{opacity: .2, transform: 'translateY(30px)'}, {opacity: 1, transform: 'none'}],
            {duration: isPhoto ? 1100 : 850, easing: 'cubic-bezier(.16,1,.3,1)', delay: Number(element.dataset.motionDelay || 0)});
            revealObserver.unobserve(element);
        });
    }, {threshold: .12});
    main.querySelectorAll('.hero-copy h1, .hero-description, .hero-buttons, .hero-visual, .introduction h2, .introduction p, .editorial-grid figure, .daily-card, .rewards-banner h2, .membership-card, .visit h2, .hours, .story-grid > img, .story-grid h2, .story-pair figure, .page-heading h1').forEach((element, index) => {
        // The first viewport already fades in as a page. Reveal only later sections.
        if (element.getBoundingClientRect().top < innerHeight) return;
        element.dataset.motionDelay = (index % 3) * 65;
        revealObserver.observe(element);
    });
    updateScrollScene();
}

function previewProduct(id) {
    const stage = $('#menu-preview');
    const product = state.products.find(p => Number(p.id) === id);
    if (!stage || !product || stage.dataset.product === String(id)) return;
    stage.dataset.product = String(id);
    const photo = productPhoto(id);
    const visibleImage = $('.preview-image', stage);
    visibleImage.src = photo.src;
    visibleImage.alt = photo.alt;
    $('.preview-name', stage).textContent = product.name;
    $('.preview-category', stage).textContent = product.category;
    $('.preview-price', stage).textContent = money(product.price);
    $('.preview-credit', stage).textContent = photo.credit;
    if (!reducedMotion.matches) visibleImage.animate([
        {opacity: .35, transform: 'scale(1.07)'},
        {opacity: 1, transform: 'scale(1)'}
    ], {duration: 550, easing: 'cubic-bezier(.16,1,.3,1)'});
}

async function api(action, body) {
    const response = await fetch(`server.php?action=${encodeURIComponent(action)}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf},
        ...(body === undefined ? {} : {body: JSON.stringify(body)})
    });
    let data;
    try { data = await response.json(); } catch { throw new Error('Open this website through XAMPP localhost, with PHP enabled.'); }
    if (!response.ok) throw new Error(data.error || 'We could not complete that request. Please try again.');
    return data;
}
function toast(message) {
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4500);
}
function updateHeader() {
    $('#bag-count').textContent = state.cart.reduce((sum, item) => sum + item.qty, 0);
    $('#account-button').innerHTML = state.user ? `${escapeHTML(state.user.name.split(' ')[0])} <span>↗</span>` : 'Sign in <span>↗</span>';
    document.querySelectorAll('[data-nav]').forEach(link => {
        if (link.dataset.nav === page()) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    });
}
function saveCart() {
    checkoutKey = null;
    try { localStorage.setItem('rio-bag', JSON.stringify(state.cart)); } catch { /* Ordering also works without local storage. */ }
    updateHeader();
}
function page() { return location.hash.slice(1).split('?')[0] || 'home'; }
function heading(kicker, title, description = '', note = '') {
    return `<div class="page-heading${note ? ' has-note' : ''}"><div><p class="eyebrow">${kicker}</p><h1>${title}</h1>${description ? `<p>${description}</p>` : ''}</div>${note ? `<aside class="heading-note">${note}</aside>` : ''}</div>`;
}
async function render() {
    const version = ++routeVersion;
    const current = page();
    const changingPage = !!renderedPage && renderedPage !== current;
    pageAnimation?.cancel();
    updateHeader();
    if (state.user && ['order', 'rewards', 'account'].includes(current)) {
        // Keep the existing page in place while the dashboard request completes.
        try {
            const dashboard = await api('dashboard');
            if (version !== routeVersion) return;
            Object.assign(state, dashboard);
        } catch (error) { if (version === routeVersion) toast(error.message); }
        if (version !== routeVersion) return;
    }
    const views = {home, menu, story, order, rewards, account: accountPage};
    const content = (views[current] || home)();
    if (changingPage && !reducedMotion.matches) {
        pageAnimation = main.animate([{opacity: 1}, {opacity: 0}], {duration: 110, easing: 'ease-out', fill: 'forwards'});
        await pageAnimation.finished.catch(() => {});
        if (version !== routeVersion) return;
    }
    main.innerHTML = content;
    document.body.dataset.page = current;
    // Swap and reset scroll together, while content is faded out.
    if (changingPage) window.scrollTo({top: 0, behavior: 'instant'});
    renderedPage = current;
    prepareMotion();
    pageAnimation?.cancel();
    if (changingPage && !reducedMotion.matches) {
        pageAnimation = main.animate([{opacity: 0}, {opacity: 1}], {duration: 280, easing: 'cubic-bezier(.2,.7,.2,1)'});
    }
    document.title = `${({home: 'A little corner. A good cup.', menu: 'The menu', story: 'Our corner', order: 'Your bag', rewards: 'Rio rewards', account: 'Your account'})[current] || 'Welcome'} — Rio Street Coffee`;
    updateHeader();
}
function openModal(content) {
    $('#modal-content').innerHTML = content;
    if (!modal.open) modal.showModal();
    document.body.classList.add('modal-open');
}
function closeModal() { modal.close(); }
modal.addEventListener('close', () => { document.body.classList.remove('modal-open'); paymentOrder = null; });
modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
function auth(mode = 'login') {
    const signup = mode === 'register';
    openModal(`<div class="auth-heading"><img src="rio%20image/LOGO.png" alt=""><p class="eyebrow">THE RIO REGULARS CLUB</p><h2 id="modal-title">${signup ? 'Your seat is <em>waiting.</em>' : 'Hello again, <em>regular.</em>'}</h2><p>${signup ? 'Good coffee. Little perks. Make yourself at home.' : 'Sign in for your usual, and a little extra.'}</p></div><form id="auth-form" data-mode="${mode}">${signup ? '<label>Your name<input name="name" autocomplete="name" minlength="2" maxlength="80" placeholder="What should we call you?" required></label>' : ''}<label>Email address<input type="email" name="email" autocomplete="email" maxlength="190" placeholder="you@example.com" required></label><label>Password<input name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="${signup ? 8 : 1}" maxlength="72" placeholder="${signup ? 'At least 8 characters' : 'Your password'}" required></label><p class="form-error" role="alert"></p><button type="submit" class="button full">${signup ? 'Make me a regular' : 'Welcome back'} <span>↗</span></button></form><p class="auth-switch">${signup ? 'Already a familiar face?' : 'New around here?'} <button class="text-link" data-action="${signup ? 'signin' : 'signup'}">${signup ? 'Sign in' : 'Create an account'}</button></p>`);
}
function showPayment(id) {
    const o = state.orders.find(order => Number(order.id) === Number(id));
    if (!o) return toast('Please refresh your orders and try again.');
    paymentOrder = Number(id);
    openModal(`<div class="payment-modal"><span class="demo-tag">PAYMENT SANDBOX</span><p class="eyebrow">RIO STREET COFFEE · RIO-${o.id}</p><h2 id="modal-title">One sip <em>closer.</em></h2><p>This is a local payment simulation.<br>No real money moves. No account details needed.</p><div class="payment-amount">${money(o.total)}<small>VIA ${escapeHTML(o.payment_method.toUpperCase())} · DEMO</small></div><div class="sandbox-graphic" aria-hidden="true">✓</div><p class="small">Choose an outcome to test the checkout flow.</p><p class="form-error" role="alert"></p><button class="button full" data-action="pay" data-outcome="paid">Simulate successful payment <span>↗</span></button><div class="sandbox-actions"><button class="text-link" data-action="pay" data-outcome="failed">Simulate failure</button><button class="text-link" data-action="pay" data-outcome="cancelled">Cancel payment</button></div></div>`);
}
function add(id) {
    const product = state.products.find(p => Number(p.id) === id);
    if (!product) return;
    const existing = state.cart.find(p => p.id === id);
    if (existing?.qty >= 20) return toast('You can add up to 20 of each item.');
    if (existing) existing.qty++;
    else state.cart.push({id, qty: 1});
    saveCart();
    if (!reducedMotion.matches) $('#bag-count').animate([
        {transform: 'scale(1)'}, {transform: 'scale(1.4)', offset: .45}, {transform: 'scale(1)'}
    ], {duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)'});
    toast(`${product.name} — a good choice. Added to your bag.`);
}
async function runButton(button, task) {
    if (button.disabled) return;
    button.disabled = true;
    try { await task(); } catch (error) {
        const errorBox = button.closest('dialog')?.querySelector('.form-error');
        if (errorBox) errorBox.textContent = error.message;
        else toast(error.message);
    } finally { button.disabled = false; }
}
document.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const id = Number(button.dataset.id);
    const action = button.dataset.action;
    if (action === 'add') return add(id);
    if (action === 'photo') {
        const product = state.products.find(p => Number(p.id) === id);
        const photo = productPhoto(id);
        openModal(`<div class="product-dialog"><img src="${photo.src}" alt="${photo.alt}"><span class="photo-credit">${photo.credit}</span><h2 id="modal-title">${escapeHTML(product.name)}</h2><p>${escapeHTML(product.description)}</p><button class="button full" data-action="add" data-id="${id}">Add to your bag <span>${money(product.price)} +</span></button></div>`);
        return;
    }
    if (action === 'close-modal') return closeModal();
    if (action === 'signin') return auth();
    if (action === 'signup') return auth('register');
    if (action === 'account') { if (state.user) location.hash = 'account'; else auth(); return; }
    if (action === 'category' || action === 'reset-search') {
        state.category = button.dataset.category || 'All';
        if (action === 'reset-search') state.search = '';
        return render();
    }
    if (action === 'quantity' || action === 'remove') {
        const item = state.cart.find(p => p.id === id);
        if (item) item.qty = action === 'remove' ? 0 : Math.min(20, item.qty + Number(button.dataset.delta));
        state.cart = state.cart.filter(p => p.qty > 0);
        saveCart(); return render();
    }
    if (action === 'resume-payment') return showPayment(id);
    runButton(button, async () => {
        if (action === 'logout') {
            await api('logout', {});
            Object.assign(state, {user: null, orders: [], vouchers: [], activity: []});
            checkoutKey = null;
            toast('See you for the next cup.');
            await render();
        } else if (action === 'refresh') {
            await render(); toast('All caught up.');
        } else if (action === 'claim') {
            Object.assign(state, await api('claim', {code: button.dataset.code}));
            await render(); toast('A little closer to your next treat. Points claimed!');
        } else if (action === 'advance') {
            Object.assign(state, await api('advance', {order_id: id}));
            await render(); toast('Demo order status updated.');
        } else if (action === 'redeem') {
            if (!state.user) return auth('register');
            const reward = state.rewards.find(r => Number(r.id) === id);
            openModal(`<p class="eyebrow">A LITTLE THANK-YOU</p><h2 id="modal-title">${escapeHTML(reward.name)}</h2><p>Exchange ${reward.points} points for ${money(reward.discount)} off your next order? Your voucher will be waiting at checkout.</p><p class="form-error" role="alert"></p><button class="button full" data-action="confirm-redeem" data-id="${id}">Redeem ${reward.points} points ↗</button>`);
        } else if (action === 'confirm-redeem') {
            Object.assign(state, await api('redeem', {reward_id: id}));
            closeModal(); await render(); toast('Your treat is ready. Use your voucher at checkout.');
        } else if (action === 'pay') {
            const orderId = paymentOrder;
            const outcome = button.dataset.outcome;
            const paymentButtons = [...modal.querySelectorAll('[data-action="pay"]')];
            paymentButtons.forEach(b => b.disabled = true);
            try {
                Object.assign(state, await api('payment', {order_id: orderId, outcome}));
                if (outcome === 'paid') {
                    // Only clear the bag when paying the checkout that created it.
                    if (activeCheckout?.id === orderId && activeCheckout.bag === JSON.stringify(state.cart)) {
                        state.cart = [];
                        saveCart();
                    }
                    activeCheckout = null;
                    try { sessionStorage.removeItem('rio-active-checkout'); } catch { /* Keep the in-memory checkout usable. */ }
                    const paid = state.orders.find(o => Number(o.id) === orderId);
                    openModal(`<div class="payment-modal"><span class="success-mark">✓</span><p class="eyebrow">SIMULATED PAYMENT COMPLETE</p><h2 id="modal-title">Good things <em>are brewing.</em></h2><p>RIO-${paid.id} · ${money(paid.total)} paid<br>Your pickup order is confirmed in this demo.</p><div class="receipt-code"><small>YOUR SIX-CHARACTER LOYALTY CODE</small><strong>${paid.loyalty_code}</strong><span>Worth ${paid.earned_points} points. Claim it in Rio rewards.</span></div><button class="button full" data-action="receipt-done">View my order <span>↗</span></button></div>`);
                } else {
                    closeModal(); toast(outcome === 'failed' ? 'Demo payment declined. Your order is saved — try again below.' : 'Payment cancelled. You can retry from your order history.');
                }
                await render();
            } finally { paymentButtons.forEach(b => b.disabled = false); }
        } else if (action === 'receipt-done') {
            closeModal();
            if (page() === 'order') await render(); else location.hash = 'order';
        }
    });
});
document.addEventListener('pointerover', event => {
    const row = event.target.closest('[data-preview-id]');
    if (row && !row.contains(event.relatedTarget)) previewProduct(Number(row.dataset.previewId));
});
document.addEventListener('focusin', event => {
    const row = event.target.closest('[data-preview-id]');
    if (row) previewProduct(Number(row.dataset.previewId));
});
document.addEventListener('pointermove', event => {
    if (finePointer.matches && !reducedMotion.matches && event.pointerType === 'mouse') {
        const target = event.target.closest(magneticTargets);
        if (target && !target.disabled) {
            const bounds = target.getBoundingClientRect();
            const x = event.clientX - bounds.left;
            const y = event.clientY - bounds.top;
            target.style.setProperty('--magnet-x', `${Math.max(-8, Math.min(8, (x - bounds.width / 2) * .16))}px`);
            target.style.setProperty('--magnet-y', `${Math.max(-6, Math.min(6, (y - bounds.height / 2) * .18))}px`);
            target.style.setProperty('--light-x', `${x}px`);
            target.style.setProperty('--light-y', `${y}px`);
        }
        const card = event.target.closest('.hero-visual, .membership-card, .reward-card');
        if (card) {
            const bounds = card.getBoundingClientRect();
            card.style.setProperty('--card-x', `${((event.clientY - bounds.top) / bounds.height - .5) * -5}deg`);
            card.style.setProperty('--card-y', `${((event.clientX - bounds.left) / bounds.width - .5) * 5}deg`);
        }
    }
    const glass = event.target.closest('.menu-feature');
    if (glass && event.pointerType === 'mouse') {
        const bounds = glass.getBoundingClientRect();
        glass.style.setProperty('--glass-x', `${event.clientX - bounds.left}px`);
        glass.style.setProperty('--glass-y', `${event.clientY - bounds.top}px`);
    }
    const row = event.target.closest('[data-preview-id]');
    const stage = $('#menu-preview');
    if (!row || !stage || reducedMotion.matches || event.pointerType !== 'mouse') return;
    const bounds = row.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    stage.style.setProperty('--tilt', `${(fraction - .5) * 3}deg`);
});
document.addEventListener('pointerout', event => {
    const target = event.target.closest(magneticTargets);
    if (target && !target.contains(event.relatedTarget)) {
        target.style.setProperty('--magnet-x', '0px');
        target.style.setProperty('--magnet-y', '0px');
    }
    const card = event.target.closest('.hero-visual, .membership-card, .reward-card');
    if (card && !card.contains(event.relatedTarget)) {
        card.style.setProperty('--card-x', '0deg');
        card.style.setProperty('--card-y', '0deg');
    }
    const row = event.target.closest('[data-preview-id]');
    if (row && !row.contains(event.relatedTarget)) {
        $('#menu-preview')?.style.setProperty('--tilt', '0deg');
    }
    if (!event.relatedTarget?.closest?.('.menu-feature')) {
        const stage = $('#menu-preview');
        stage?.style.setProperty('--glass-x', '50%');
        stage?.style.setProperty('--glass-y', '12%');
    }
});
document.addEventListener('pointerdown', event => {
    const control = event.target.closest('.button, .small-button, .add-button, .bag-link, .tabs button, .product-photo-button');
    if (!control || control.disabled || reducedMotion.matches) return;
    const bounds = control.getBoundingClientRect();
    const ripple = document.createElement('i');
    ripple.className = 'interaction-ripple';
    ripple.setAttribute('aria-hidden', 'true');
    const size = Math.max(bounds.width, bounds.height) * 2;
    Object.assign(ripple.style, {width: `${size}px`, height: `${size}px`, left: `${event.clientX - bounds.left - size / 2}px`, top: `${event.clientY - bounds.top - size / 2}px`});
    control.append(ripple);
    ripple.animate([{transform: 'scale(0)', opacity: .35}, {transform: 'scale(1)', opacity: 0}], {duration: 650, easing: 'cubic-bezier(.16,1,.3,1)'}).finished.then(() => ripple.remove(), () => ripple.remove());
});
document.addEventListener('keydown', event => {
    if (!['Enter', ' '].includes(event.key) || reducedMotion.matches) return;
    const control = event.target.closest('button, a.button');
    if (control && !control.disabled) control.animate([{scale: '1'}, {scale: '.96'}, {scale: '1'}], {duration: 220});
});
reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
        document.getAnimations().forEach(animation => animation.cancel());
        document.querySelectorAll(magneticTargets).forEach(element => {
            element.style.setProperty('--magnet-x', '0px');
            element.style.setProperty('--magnet-y', '0px');
        });
    }
    prepareMotion();
});
document.addEventListener('input', event => {
    if (event.target.id === 'menu-search') { state.search = event.target.value; $('#product-list').innerHTML = productList(); }
});
document.addEventListener('change', event => {
    if (event.target.closest('#checkout-form')) checkoutKey = null;
    if (event.target.id === 'checkout-voucher') {
        const subtotal = Number($('#checkout-total').dataset.subtotal);
        const discount = Math.min(subtotal, Number(event.target.selectedOptions[0].dataset.discount || 0));
        $('#discount-line').hidden = !discount;
        $('#discount-amount').textContent = `−${money(discount)}`;
        $('#checkout-total').textContent = money(subtotal - discount);
        $('#potential-points').textContent = `Your receipt unlocks ${Math.floor((subtotal - discount) / 10)} points.`;
    }
});
document.addEventListener('submit', async event => {
    const form = event.target;
    if (!['auth-form', 'checkout-form', 'claim-form'].includes(form.id)) return;
    event.preventDefault();
    const button = $('button[type="submit"]', form);
    const errorBox = $('.form-error', form);
    if (button.disabled) return;
    if (form.id === 'checkout-form' && !state.user) return auth();
    button.disabled = true;
    errorBox.textContent = '';
    const data = Object.fromEntries(new FormData(form));
    try {
        if (form.id === 'auth-form') {
            Object.assign(state, await api(form.dataset.mode, data));
            closeModal(); await render(); toast(`Your corner is ready, ${state.user.name.split(' ')[0]}.`);
        } else if (form.id === 'claim-form') {
            Object.assign(state, await api('claim', data));
            await render(); toast('Points claimed. That next treat is getting closer.');
        } else {
            checkoutKey ||= crypto.randomUUID();
            const result = await api('checkout', {...data, items: state.cart, key: checkoutKey});
            activeCheckout = {id: Number(result.order_id), bag: JSON.stringify(state.cart)};
            try { sessionStorage.setItem('rio-active-checkout', JSON.stringify(activeCheckout)); } catch { /* Keep the in-memory checkout usable. */ }
            Object.assign(state, await api('dashboard'));
            showPayment(result.order_id);
        }
    } catch (error) { errorBox.textContent = error.message; }
    finally { button.disabled = false; }
});
window.addEventListener('hashchange', () => { closeModal(); render(); });

async function init() {
    const started = performance.now();
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const hideLoader = () => $('#loader').classList.add('loaded');
    // Fail open on a slow database, without an empty screen underneath.
    const fallback = setTimeout(async () => {
        if (!renderedPage) await render();
        hideLoader();
    }, 4500);
    try {
        Object.assign(state, await api('bootstrap'));
        state.ready = true;
        state.cart = state.cart.filter(item => state.products.some(p => Number(p.id) === item.id));
        saveCart();
    } catch (error) {
        $('#connection-error').textContent = error.message;
        $('#connection-error').hidden = false;
    } finally {
        await render();
        // Let fonts and the first visible photograph settle before the curtain fades.
        const photo = main.querySelector('.hero-photo, .preview-image, .story-grid > img');
        await Promise.race([
            Promise.all([document.fonts.ready, photo?.decode().catch(() => {})]),
            wait(900)
        ]);
        await wait(Math.max(0, 700 - (performance.now() - started)));
        clearTimeout(fallback);
        hideLoader();
    }
}
init();
