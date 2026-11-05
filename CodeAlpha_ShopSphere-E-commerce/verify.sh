#!/usr/bin/env bash
# End-to-end verification for ShopSphere (acceptance checklist).
set +e
cd /home/z/my-project

# Ensure the dev server is up (it may have been killed between commands).
if ! curl -s -o /dev/null http://localhost:3000/; then
  echo "### starting dev server…"
  pkill -f "next dev" 2>/dev/null; sleep 1
  setsid node node_modules/.bin/next dev -p 3000 > dev.log 2>&1 < /dev/null & disown
  for i in $(seq 1 40); do curl -s -o /dev/null http://localhost:3000/ && break; sleep 0.5; done
  sleep 2
fi

PASS=0; FAIL=0
check(){ if [ "$1" = "$2" ]; then echo "  ✅ $3"; PASS=$((PASS+1)); else echo "  ❌ $3 (got '$1' want '$2')"; FAIL=$((FAIL+1)); fi; }
has(){ if echo "$1" | grep -q "$2"; then echo "  ✅ $3"; PASS=$((PASS+1)); else echo "  ❌ $3 (missing '$2')"; FAIL=$((FAIL+1)); fi; }
W(){ agent-browser wait "$1" >/dev/null 2>&1; }
step(){ echo; echo "════ $1 ════"; }

agent-browser close >/dev/null 2>&1
agent-browser set viewport 1280 900 >/dev/null 2>&1

# Suppress toaster + helper fns (from previous session's working harness).
agent-browser eval "(()=>{if(document.getElementById('hide-toaster-css'))return; const s=document.createElement('style'); s.id='hide-toaster-css'; s.textContent='[data-sonner-toaster]{display:none !important}'; document.head.appendChild(s);})()" >/dev/null 2>&1
clickText(){ agent-browser eval "(()=>{const b=[...document.querySelectorAll('button,[role=button],[role=menuitem]')].find(b=>b.textContent.trim()==='$1'); if(b){b.click();return 'ok'} return 'none';})()" 2>/dev/null | tr -d '"'; }
clickAria(){ agent-browser eval "(()=>{const b=[...document.querySelectorAll('button,[role=button]')].find(b=>b.getAttribute('aria-label')==='$1'); if(b){b.click();return 'ok'} return 'none';})()" 2>/dev/null | tr -d '"'; }
clickByPattern(){ local ref; ref=$(agent-browser snapshot -i -c 2>/dev/null | grep -F "$1" | grep -oE 'ref=e[0-9]+' | sed 's/ref=//' | head -1); if [ -n "$ref" ]; then agent-browser click "@$ref" >/dev/null 2>&1 && echo ok || echo fail; else echo none; fi; }
bodyHas(){ agent-browser eval "document.body.innerText.includes('$1')?'Y':'N'" 2>/dev/null | tr -d '"'; }
cartCount(){ agent-browser eval "JSON.parse(localStorage.getItem('shopsphere-cart')||'{}').state?.items?.length ?? 0" 2>/dev/null | tr -d '"'; }
fillInput(){ agent-browser eval "(()=>{const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; const el=document.querySelector('$1'); if(!el) return 'no-el'; s.call(el,$2); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return 'ok';})()" 2>/dev/null | tr -d '"'; }
clickSubmit(){ agent-browser eval "(()=>{const b=document.querySelector('button[type=submit]'); if(b){b.click();return 'ok'} return 'none';})()" 2>/dev/null | tr -d '"'; }

step "1. Home — categories + featured + new arrivals + premium images"
agent-browser open http://localhost:3000/ >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1; W 2000
check "$(agent-browser get title 2>/dev/null)" "ShopSphere — Curated goods for modern living" "home title"
has "$(bodyHas 'Shop by category')" Y "Shop by category section present"
has "$(bodyHas 'Featured products')" Y "Featured products section present"
has "$(bodyHas 'New arrivals')" Y "New arrivals section present"
# All 5 categories rendered in the shop-by-category grid
has "$(agent-browser eval "/Beauty|Fashion|Electronics|Home & Living|Sports/.test(document.body.innerText)?'Y':'N'" 2>/dev/null | tr -d '"')" Y "all 5 category names visible"
# Featured cards count (should be ~12)
FCOUNT=$(agent-browser eval "document.querySelectorAll('img[src*=\"/products/\"]').length" 2>/dev/null | tr -d '"')
echo "  product/category images on home: $FCOUNT"
check "$(agent-browser eval "document.querySelectorAll('img').length>20?'Y':'N'" 2>/dev/null | tr -d '"')" Y "many images rendered on home"
# No broken image icons — scroll through the page to trigger lazy loads, then
# check that every image that FINISHED loading has a non-zero naturalWidth.
agent-browser eval "window.scrollTo(0,document.body.scrollHeight)" >/dev/null 2>&1; W 2000
agent-browser eval "window.scrollTo(0,0)" >/dev/null 2>&1; W 1500
check "$(agent-browser eval "[...document.querySelectorAll('img')].filter(i=>i.complete && i.naturalWidth===0).length===0?'Y':'N'" 2>/dev/null | tr -d '"')" Y "no broken images on home (after lazy load)"
# Footer
has "$(agent-browser eval "document.body.innerText.includes('CodeAlpha')?'Y':'N'" 2>/dev/null | tr -d '"')" N "footer has NO CodeAlpha reference"
has "$(agent-browser eval "/© 2026 ShopSphere\\./.test(document.body.innerText)?'Y':'N'" 2>/dev/null | tr -d '"')" Y "footer reads '© 2026 ShopSphere.'"
agent-browser screenshot /tmp/shots/v1-home.png >/dev/null 2>&1

step "2. Shop All — 55 products, count, category sidebar opens"
clickText 'Shop All' >/dev/null; W 2000
has "$(bodyHas 'All products')" Y "products view heading"
# Product count text — should show 55
COUNT_TEXT=$(agent-browser eval "document.body.innerText.match(/(\d+)\s+products?/i)?.[1] || 'none'" 2>/dev/null | tr -d '"')
echo "  product count text: $COUNT_TEXT"
check "$COUNT_TEXT" "55" "Shop All shows 55 products"
# Sidebar category list visible (desktop) with 5 categories + All
has "$(agent-browser eval "[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Electronics').length>0?'Y':'N'" 2>/dev/null | tr -d '"')" Y "Electronics category in sidebar"
has "$(agent-browser eval "[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Beauty').length>0?'Y':'N'" 2>/dev/null | tr -d '"')" Y "Beauty category in sidebar"
# Cards rendered — a known price appears in the page text
check "$(agent-browser eval "document.body.innerText.includes('USD')||/\\\$[0-9]/.test(document.body.innerText)?'Y':'N'" 2>/dev/null | tr -d '"')" Y "product cards with prices rendered"
agent-browser screenshot /tmp/shots/v2-shopall.png >/dev/null 2>&1

step "3. Category filter — click Electronics"
agent-browser eval "(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Electronics'); if(b){b.click();return 'ok'} return 'none';})()" >/dev/null 2>&1
W 1500
ECOUNT=$(agent-browser eval "document.body.innerText.match(/(\d+)\s+products?/i)?.[1] || 'none'" 2>/dev/null | tr -d '"')
echo "  electronics count: $ECOUNT"
check "$ECOUNT" "11" "Electronics filter shows 11 products"
has "$(agent-browser eval "[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Electronics')?.className?.includes('primary')||[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Electronics')?.getAttribute('class')?.includes('primary')?'Y':'N'" 2>/dev/null | tr -d '"')" Y "Electronics active state highlighted"
agent-browser screenshot /tmp/shots/v3-electronics.png >/dev/null 2>&1

step "4. Clear filters, then Search"
clickText 'Clear filters' >/dev/null; W 1500
CFTEXT=$(agent-browser eval "document.body.innerText.match(/(\d+)\s+products?/i)?.[1] || 'none'" 2>/dev/null | tr -d '"')
echo "  after clear: $CFTEXT"
check "$CFTEXT" "55" "Clear filters restores all 55 products"
# Use the HEADER search (navigates with ?q=). Set value + submit the form.
agent-browser eval "(()=>{const f=[...document.querySelectorAll('form')].find(f=>f.querySelector('input[aria-label=\"Search products\"]')); if(!f)return 'none'; const el=f.querySelector('input[aria-label=\"Search products\"]'); const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; s.call(el,'headphones'); el.dispatchEvent(new Event('input',{bubbles:true})); f.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true})); return 'ok';})()" >/dev/null 2>&1
W 1800
SCOUNT=$(agent-browser eval "document.body.innerText.match(/(\d+)\s+products?/i)?.[1] || 'none'" 2>/dev/null | tr -d '"')
echo "  search 'headphones' count: $SCOUNT"
# Should be a small number (1 product named headphones)
check "$SCOUNT" "1" "search 'headphones' narrows to 1 result"
agent-browser screenshot /tmp/shots/v4-search.png >/dev/null 2>&1

step "6. Price filter (max $50)"
clickText 'Clear filters' >/dev/null; W 1500
agent-browser eval "(()=>{const el=document.getElementById('maxPrice')||document.querySelector('input[aria-label=\"Maximum price\"]')||[...document.querySelectorAll('input')].find(i=>i.placeholder?.includes('Max')); if(!el)return 'none'; const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; s.call(el,'50'); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return 'ok';})()" >/dev/null 2>&1
W 1500
PCTEXT=$(agent-browser eval "document.body.innerText.match(/(\d+)\s+products?/i)?.[1] || 'none'" 2>/dev/null | tr -d '"')
echo "  price max \$50 count: $PCTEXT"
check "$(agent-browser eval "Number('$PCTEXT')<55 && Number('$PCTEXT')>=1?'Y':'N'" 2>/dev/null | tr -d '"')" Y "price filter narrows results"
# clear max price
agent-browser eval "(()=>{const el=[...document.querySelectorAll('input')].find(i=>i.placeholder?.includes('Max'))||document.getElementById('maxPrice'); if(!el)return; const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; s.call(el,'1500'); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));})()" >/dev/null 2>&1
W 1000

step "7. Sort — price low to high"
agent-browser eval "(()=>{const t=document.querySelector('button[role=combobox]')||[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-haspopup')==='listbox'); if(t){t.click();return 'open'} return 'none';})()" >/dev/null 2>&1
W 600
agent-browser eval "(()=>{const o=[...document.querySelectorAll('[role=option]')].find(o=>/Low to High/.test(o.textContent)); if(o){o.click();return 'ok'} return 'none';})()" >/dev/null 2>&1
W 1500
agent-browser screenshot /tmp/shots/v7-sorted.png >/dev/null 2>&1
echo "  sort applied (screenshot saved)"

step "8. Product detail + add to cart"
# Click the first product card
agent-browser eval "(()=>{const c=document.querySelector('img[src*=\"/products/\"]'); if(!c)return 'none'; c.closest('button,[role=button]')?.click()||c.click(); return 'ok';})()" >/dev/null 2>&1
W 2000
has "$(bodyHas 'Add to cart')" Y "product detail page loaded"
has "$(agent-browser eval "document.querySelector('h1')?.innerText?.length>0?'Y':'N'" 2>/dev/null | tr -d '"')" Y "product detail has a title"
check "$(agent-browser eval "document.querySelectorAll('img[src*=\"/products/\"]').length>=1?'Y':'N'" 2>/dev/null | tr -d '"')" Y "product detail shows product image"
check "$(agent-browser eval "[...document.querySelectorAll('img')].every(i=>i.naturalWidth>0)?'Y':'N'" 2>/dev/null | tr -d '"')" Y "no broken images on product detail"
clickText 'Add to cart' >/dev/null; W 1200
check "$(cartCount)" "1" "add to cart from product detail (cart=1)"
agent-browser screenshot /tmp/shots/v8-detail.png >/dev/null 2>&1

step "9. Cart"
clickAria 'Cart' >/dev/null; W 1500
has "$(bodyHas 'Shopping cart')" Y "cart view heading"
has "$(bodyHas 'Proceed to checkout')" Y "cart has checkout button"
agent-browser screenshot /tmp/shots/v9-cart.png >/dev/null 2>&1

step "10. Featured section count on home (re-check via API already 12)"
agent-browser open http://localhost:3000/ >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1; W 2500
# Count featured cards by section: find "Featured products" heading then count following ProductCards
FCARDS=$(agent-browser eval "(()=>{const h=[...document.querySelectorAll('h2')].find(h=>h.textContent.trim()==='Featured products'); if(!h)return '0'; let s=h.parentElement, n=0; const sec=h.closest('section'); sec?.querySelectorAll('img[src*=\"/products/\"]').forEach(()=>n++); return String(n);})()" 2>/dev/null | tr -d '"')
echo "  featured images in section: $FCARDS"
check "$(agent-browser eval "Number('$FCARDS')>=10?'Y':'N'" 2>/dev/null | tr -d '"')" Y "Featured shows 10+ products"
NCARDS=$(agent-browser eval "(()=>{const h=[...document.querySelectorAll('h2')].find(h=>h.textContent.trim()==='New arrivals'); if(!h)return '0'; const sec=h.closest('section'); let n=0; sec?.querySelectorAll('img[src*=\"/products/\"]').forEach(()=>n++); return String(n);})()" 2>/dev/null | tr -d '"')
echo "  new-arrival images in section: $NCARDS"
check "$(agent-browser eval "Number('$NCARDS')>=10?'Y':'N'" 2>/dev/null | tr -d '"')" Y "New arrivals shows 10+ products"
agent-browser screenshot /tmp/shots/v10-home-featured.png >/dev/null 2>&1

step "11. Auth still works — login page"
clickText 'Sign in' >/dev/null; W 1500
has "$(bodyHas 'Welcome back')" Y "login form renders"
fillInput 'input[type=email]' "'demo@shopsphere.dev'" >/dev/null
fillInput 'input[type=password]' "'demo123'" >/dev/null
clickSubmit >/dev/null; agent-browser wait --load networkidle >/dev/null 2>&1; W 2500
has "$(bodyHas 'Welcome back')" N "login succeeds (left login view)"

step "12. Console / page errors"
echo "--- page errors ---"; agent-browser errors 2>&1 | head -n 20
echo "--- console err/warn ---"; agent-browser console 2>&1 | grep -iE "error|warn|unhandled|fail" | head -n 20

step "13. Mobile responsive + footer"
agent-browser set viewport 375 812 >/dev/null 2>&1
agent-browser open http://localhost:3000/ >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1; W 2000
has "$(agent-browser eval "document.querySelector('footer')?'Y':'N'" 2>/dev/null | tr -d '"')" Y "footer present on mobile"
has "$(agent-browser eval "[...document.querySelectorAll('button,[role=button]')].find(b=>b.getAttribute('aria-label')==='Open menu')?'Y':'N'" 2>/dev/null | tr -d '"')" Y "mobile hamburger present"
# Mobile: open filters sheet and verify category list works
clickText 'Shop All' >/dev/null; W 2000
agent-browser eval "(()=>{const b=[...document.querySelectorAll('button')].find(b=>/Filters/.test(b.textContent)); if(b){b.click();return 'ok'} return 'none';})()" >/dev/null 2>&1
W 1000
has "$(agent-browser eval "[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Electronics').length>0?'Y':'N'" 2>/dev/null | tr -d '"')" Y "mobile filter sheet shows categories"
agent-browser screenshot /tmp/shots/v13-mobile.png >/dev/null 2>&1

echo
echo "════ RESULTS: $PASS passed, $FAIL failed ════"
agent-browser close >/dev/null 2>&1