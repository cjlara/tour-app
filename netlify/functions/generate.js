const https = require("https");

exports.handler = async function (event) {
  const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type, x-admin-token","Access-Control-Allow-Methods":"POST, OPTIONS"};
  const json = (c,o) => ({statusCode:c,headers:{...cors,"Content-Type":"application/json"},body:JSON.stringify(o)});
  if (event.httpMethod === "OPTIONS") return {statusCode:200,headers:cors,body:""};
  const tok = (event.headers["x-admin-token"]||"").trim();
  if (tok !== (process.env.ADMIN_TOKEN||"cordoba2025").trim()) return json(401,{error:"Token incorrecto"});
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json(500,{error:"ANTHROPIC_API_KEY no configurada"});
  let body; try{body=JSON.parse(event.body);}catch{return json(400,{error:"JSON inválido"});}
  const {name,location,type,city} = body;
  if (!name||!location) return json(400,{error:"Faltan name y location"});

  const typeLabels = {monument:"monumento histórico",restaurant:"restaurante o taberna",neighborhood:"barrio o zona histórica",museum:"museo",viewpoint:"mirador o espacio natural",market:"mercado o zona comercial",other:"atracción turística"};
  const tl = typeLabels[type]||typeLabels.other;
  const isRest = type==="restaurant";

  const prompt = `Eres un experto guía turístico especializado en ${city||location}.
Genera información turística completa en español para: "${name}" (${tl}) en ${location}.
Responde SOLO con JSON válido, sin markdown, sin backticks:
{
  "subtitle": "frase evocadora de 8-12 palabras",
  "description": "descripción de 3-4 frases informativas para turistas",
  "history": "contexto histórico fascinante con datos precisos, 3-4 frases",
  "audioSections": [
    {"id":"as-1","title":"Título primera sección","text":"narración de 60-80 palabras en segunda persona, evocadora","mapImage":""},
    {"id":"as-2","title":"Título segunda sección","text":"narración de 60-80 palabras","mapImage":""}${!isRest?',{"id":"as-3","title":"Título tercera sección","text":"narración de 60-80 palabras","mapImage":""}':''}
  ],
  "facts": [
    {"value":"dato o año","label":"etiqueta corta"},
    {"value":"dato o año","label":"etiqueta corta"},
    {"value":"dato o año","label":"etiqueta corta"}
  ],
  "tips": ["consejo práctico con detalle concreto","consejo práctico","consejo práctico","consejo práctico"],
  "dishes": ${isRest?'[{"name":"nombre plato","description":"descripción breve"},{"name":"...","description":"..."},{"name":"...","description":"..."}]':"null"},
  "color": "${type==='restaurant'?'#E84040':type==='museum'?'#6B7FA3':type==='viewpoint'?'#5A8A5E':type==='neighborhood'?'#7A9E9F':'#C9A84C'}",
  "website": "",
  "bookingUrl": ${isRest?'""':"null"},
  "phone": ${isRest?'""':"null"},
  "priceRange": ${isRest?'""':"null"},
  "lat": null,
  "lng": null,
  "address": "",
  "videoUrl": "",
  "suggestedTime": "hora recomendada HH:MM",
  "suggestedDuration": "duración p.ej. 60 min",
  "type": "${type||'monument'}"
}`;

  try {
    const result = await callClaude(apiKey, prompt);
    const text = result.content&&result.content[0]&&result.content[0].text;
    if (!text) return json(500,{error:"Respuesta vacía de Claude"});
    const clean = text.replace(/^```json\n?/i,"").replace(/^```\n?/i,"").replace(/```$/m,"").trim();
    let data; try{data=JSON.parse(clean);}catch(e){return json(500,{error:"JSON inválido de Claude",raw:text.slice(0,400)});}
    data.name=name; data.location=location; data.photos=[];
    data.id="stop-"+name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
    return json(200,{ok:true,stop:data});
  } catch(err) { return json(500,{error:err.message}); }
};

function callClaude(apiKey,prompt){
  return new Promise((resolve,reject)=>{
    const payload=JSON.stringify({model:"claude-haiku-4-5",max_tokens:1800,messages:[{role:"user",content:prompt}]});
    const req=https.request({hostname:"api.anthropic.com",path:"/v1/messages",method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","Content-Length":Buffer.byteLength(payload)}},(res)=>{
      let d="";res.on("data",c=>d+=c);res.on("end",()=>{try{resolve(JSON.parse(d));}catch(e){reject(new Error("Parse: "+d.slice(0,200)));}});
    });
    req.on("error",reject);req.setTimeout(30000,()=>{req.destroy();reject(new Error("Timeout"));});
    req.write(payload);req.end();
  });
}
