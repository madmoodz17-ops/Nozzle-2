// نص الطريق - ملف واحد بس، من غير ما تنزّل أي مكتبات
// في Replit: اعمل Repl من نوع Node.js، وامسح اللي في index.js وحط الكود ده مكانه
// وبعدين من Secrets ضيف: GOOGLE_MAPS_KEY = مفتاحك

const http = require('http');
const KEY = process.env.GOOGLE_MAPS_KEY || '';
const events = {}; // الخروجات بتتخزن في الذاكرة (لو الـ Repl اتعمله restart بتتمسح)

const PAGE = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>نص الطريق</title>
<style>
body{font-family:sans-serif;margin:0;padding:12px;max-width:600px;margin:auto}
#map{height:45vh;border-radius:12px;margin:8px 0}
button{padding:12px;font-size:16px;margin:4px 0;width:100%;border-radius:10px;border:0;background:#1a73e8;color:#fff}
input{padding:10px;font-size:16px;width:100%;box-sizing:border-box;margin:4px 0}
.p{border:1px solid #ddd;border-radius:10px;padding:10px;margin:6px 0}
</style></head><body>
<div id="home"><h2>نص الطريق 📍</h2>
<input id="n" placeholder="اسم الخروجة (مثلا: عشا الخميس)">
<button onclick="mk()">اعمل خروجة جديدة</button></div>
<div id="ev" style="display:none">
<h3 id="t"></h3>
<input id="who" placeholder="اسمك">
<button onclick="share()">شارك لوكيشني</button>
<div id="map"></div><div id="mid"></div><div id="list"></div>
<small>ابعت اللينك اللي فوق في المتصفح لصحابك</small></div>
<script>
var EID='__ID__',map,markers=[],midKey='',PL=[],state={name:'',people:{},votes:{}};
if(EID){document.getElementById('home').style.display='none';document.getElementById('ev').style.display='block';}
document.getElementById('who').value=localStorage.getItem('who')||'';

function esc(s){return String(s).replace(/[&<>"]/g,'')}
function mk(){
  fetch('/api/create',{method:'POST',body:JSON.stringify({name:document.getElementById('n').value})})
  .then(function(r){return r.json()}).then(function(d){location.href='/e/'+d.id});
}
function post(k,b){
  return fetch('/api/e/'+EID+'/'+k,{method:'POST',body:JSON.stringify(b)})
  .then(function(r){return r.json()}).then(function(s){state=s;draw()});
}
function who(){
  var w=document.getElementById('who').value.trim();
  if(!w){alert('اكتب اسمك الأول');return null}
  localStorage.setItem('who',w);return w;
}
function share(){
  var w=who();if(!w)return;
  navigator.geolocation.getCurrentPosition(function(p){
    post('loc',{who:w,lat:p.coords.latitude,lng:p.coords.longitude});
  },function(){alert('مش قادر أجيب لوكيشنك، اتأكد إنك سمحت بالإذن')});
}
function vote(id){var w=who();if(w)post('vote',{who:w,place:id})}

function km(a,b){
  var R=6371,r=Math.PI/180,x=(b.lat-a.lat)*r,y=(b.lng-a.lng)*r;
  var h=Math.sin(x/2)*Math.sin(x/2)+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(y/2)*Math.sin(y/2);
  return 2*R*Math.asin(Math.sqrt(h));
}

function init(){
  if(!EID)return;
  map=new google.maps.Map(document.getElementById('map'),{center:{lat:30.0444,lng:31.2357},zoom:11});
  poll();setInterval(poll,4000);
}
function poll(){
  fetch('/api/e/'+EID).then(function(r){return r.json()}).then(function(s){
    state=s;document.getElementById('t').textContent=s.name;draw();
  });
}

function draw(){
  if(!map)return;
  markers.forEach(function(m){m.setMap(null)});markers=[];
  var names=Object.keys(state.people);
  var pts=names.map(function(n){return state.people[n]});
  names.forEach(function(n){
    markers.push(new google.maps.Marker({position:state.people[n],map:map,label:n.charAt(0)}));
  });
  if(pts.length<2){
    document.getElementById('mid').textContent='مستنيين اتنين على الأقل يشاركوا لوكيشنهم (دلوقتي: '+pts.length+')';
    render();return;
  }
  var c={lat:0,lng:0};
  pts.forEach(function(p){c.lat+=p.lat/pts.length;c.lng+=p.lng/pts.length});
  markers.push(new google.maps.Marker({position:c,map:map,title:'نص الطريق',icon:'https://maps.google.com/mapfiles/ms/icons/green-dot.png'}));
  document.getElementById('mid').innerHTML='<h4>نقطة النص ✅ والأماكن القريبة منها:</h4>';
  var k=pts.length+':'+c.lat.toFixed(3)+','+c.lng.toFixed(3);
  if(k!==midKey){
    midKey=k;
    var b=new google.maps.LatLngBounds();
    pts.forEach(function(p){b.extend(p)});b.extend(c);map.fitBounds(b);
    find(c);
  } else render();
}

async function find(c){
  try{
    var lib=await google.maps.importLibrary('places');
    var r=await lib.Place.searchNearby({
      fields:['id','displayName','location','rating'],
      locationRestriction:{center:c,radius:2500},
      includedPrimaryTypes:['restaurant','cafe'],
      maxResultCount:10
    });
    PL=r.places.filter(function(p){return p.rating}).sort(function(a,b){return b.rating-a.rating}).slice(0,4)
      .map(function(p){return {id:p.id,name:p.displayName,rating:p.rating,loc:{lat:p.location.lat(),lng:p.location.lng()}}});
    if(!PL.length)document.getElementById('list').textContent='مفيش أماكن قريبة من النقطة دي';
  }catch(e){
    PL=[];document.getElementById('list').textContent='مشكلة في البحث عن الأماكن: '+e.message;
  }
  render();
}

function render(){
  if(!PL.length)return;
  var cnt={};
  Object.keys(state.votes).forEach(function(w){var v=state.votes[w];cnt[v]=(cnt[v]||0)+1});
  document.getElementById('list').innerHTML=PL.map(function(p){
    var d=Object.keys(state.people).map(function(n){
      return esc(n)+': '+km(state.people[n],p.loc).toFixed(1)+' كم';
    }).join(' | ');
    return '<div class="p"><b>'+esc(p.name)+'</b> ⭐'+p.rating+'<br><small>'+d+'</small>'
      +'<button data-id="'+p.id+'" onclick="vote(this.dataset.id)">صوّت ('+(cnt[p.id]||0)+')</button></div>';
  }).join('');
}
</script>
<script async src="https://maps.googleapis.com/maps/api/js?key=__KEY__&callback=init"></script>
</body></html>`;

function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'application/json' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}
function readBody(req, cb) {
  var d = '';
  req.on('data', function (c) { d += c; });
  req.on('end', function () { try { cb(JSON.parse(d || '{}')); } catch (e) { cb({}); } });
}
function page(id) { return PAGE.replace('__ID__', id).replace('__KEY__', KEY); }

http.createServer(function (req, res) {
  var u = req.url.split('?')[0], m;
  if (req.method === 'GET' && u === '/') return send(res, 200, page(''), 'text/html; charset=utf-8');
  if (req.method === 'POST' && u === '/api/create') {
    return readBody(req, function (b) {
      var id = Math.random().toString(36).slice(2, 8);
      events[id] = { name: b.name || 'خروجة', people: {}, votes: {} };
      send(res, 200, { id: id });
    });
  }
  if ((m = u.match(/^\/e\/(\w+)$/))) return send(res, 200, page(m[1]), 'text/html; charset=utf-8');
  if ((m = u.match(/^\/api\/e\/(\w+)$/)) && req.method === 'GET') {
    var e = events[m[1]];
    return e ? send(res, 200, e) : send(res, 404, {});
  }
  if ((m = u.match(/^\/api\/e\/(\w+)\/(loc|vote)$/)) && req.method === 'POST') {
    var ev = events[m[1]], kind = m[2];
    if (!ev) return send(res, 404, {});
    return readBody(req, function (b) {
      if (!b.who) return send(res, 400, {});
      if (kind === 'loc') ev.people[b.who] = { lat: b.lat, lng: b.lng };
      else ev.votes[b.who] = b.place;
      send(res, 200, ev);
    });
  }
  send(res, 404, {});
}).listen(process.env.PORT || 3000, '0.0.0.0');
