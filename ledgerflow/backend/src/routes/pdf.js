const express = require('express');
const PDFDocument = require('pdfkit');
const pool = require('../db/pool');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

const Rs = (n) => `Rs. ${Number(n || 0).toFixed(2)}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

function numToWords(n) {
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  n = Math.round(n);
  if (n === 0) return 'Zero';
  if (n < 20) return a[n];
  if (n < 100) return b[Math.floor(n/10)] + (n%10 ? ' '+a[n%10] : '');
  if (n < 1000) return a[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' '+numToWords(n%100) : '');
  if (n < 100000) return numToWords(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' '+numToWords(n%1000) : '');
  if (n < 10000000) return numToWords(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' '+numToWords(n%100000) : '');
  return numToWords(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' '+numToWords(n%10000000) : '');
}
function amtWords(n) {
  const r = Math.floor(n), p = Math.round((n-r)*100);
  return numToWords(r) + ' Rupees' + (p>0 ? ' and '+numToWords(p)+' Paise' : '') + ' only';
}

const STATES = {'01':'Jammu & Kashmir','02':'Himachal Pradesh','03':'Punjab','04':'Chandigarh','05':'Uttarakhand','06':'Haryana','07':'Delhi','08':'Rajasthan','09':'Uttar Pradesh','10':'Bihar','18':'Assam','19':'West Bengal','20':'Jharkhand','21':'Odisha','22':'Chhattisgarh','23':'Madhya Pradesh','24':'Gujarat','27':'Maharashtra','29':'Karnataka','30':'Goa','32':'Kerala','33':'Tamil Nadu','36':'Telangana','37':'Andhra Pradesh'};
const sname = (c) => c ? c+'-'+(STATES[c]||c) : '';

router.get('/invoice/:id', async (req, res, next) => {
  try {
    const inv = await pool.query(
      `SELECT i.*, c.name AS cn, c.email AS ce, c.address AS ca, c.gstin AS cg, c.phone AS cp, c.state_code AS cs, b.name AS bn, b.gstin AS bg, b.address AS ba, b.phone AS bp, b.email AS be, b.state_code AS bs FROM invoices i JOIN customers c ON c.id=i.customer_id LEFT JOIN businesses b ON b.id=i.business_id WHERE i.id=$1 AND i.user_id=$2`,
      [req.params.id, req.user.id]
    );
    if (!inv.rows[0]) return res.status(404).json({ message: 'Invoice not found.' });
    const I = inv.rows[0];
    const itemsRes = await pool.query(`SELECT ii.*, p.name AS pn, p.unit AS pu FROM invoice_items ii JOIN products p ON p.id=ii.product_id WHERE ii.invoice_id=$1 ORDER BY ii.id`, [req.params.id]);
    const items = itemsRes.rows;

    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="'+I.invoice_number+'.pdf"');
    doc.pipe(res);

    const ML=30, CW=535, B='#000000', G='#555555', LG='#f2f2f2', BC='#aaaaaa';
    let y=20;

    function dRect(x,ry,w,h,fill){ if(fill){doc.rect(x,ry,w,h).fill(fill);} doc.rect(x,ry,w,h).strokeColor(BC).lineWidth(0.5).stroke(); }
    function dVL(x,ry,h){ doc.moveTo(x,ry).lineTo(x,ry+h).strokeColor(BC).lineWidth(0.5).stroke(); }
    function cell(t,x,ry,w,opts){ const {sz=8.5,bold=false,al='left',col=B}=opts||{}; doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(sz).fillColor(col).text(String(t||''),x+3,ry+4,{width:w-6,align:al,lineBreak:false}); }

    // TITLE
    doc.font('Helvetica-Bold').fontSize(16).fillColor(B).text('Tax Invoice',ML,y,{width:CW,align:'center'});
    y+=24;

    // HEADER
    dRect(ML,y,CW,88,'#ffffff');
    dRect(ML+4,y+4,62,62,LG);
    doc.font('Helvetica').fontSize(7).fillColor(G).text('Your Logo',ML+4,y+30,{width:62,align:'center'});
    doc.font('Helvetica-Bold').fontSize(16).fillColor(B).text(I.bn||'Your Company',ML+72,y+6,{width:CW-78});
    doc.font('Helvetica').fontSize(8.5).fillColor(G).text(I.ba||'',ML+72,y+28,{width:CW*0.6});
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(B).text('Phone: '+(I.bp||'-'),ML+72,y+54);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(B).text('Email: '+(I.be||'-'),ML+72+200,y+54);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(B).text('GSTIN: '+(I.bg||'N/A'),ML+72,y+68);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(B).text('State: '+sname(I.bs),ML+72+200,y+68);
    y+=88;

    // BILL TO + INVOICE DETAILS
    const c1=Math.floor(CW*0.52), c2=CW-c1;
    dRect(ML,y,c1,82,'#ffffff');
    dRect(ML+c1,y,c2,82,'#ffffff');
    doc.font('Helvetica-Bold').fontSize(9).fillColor(B).text('Bill To:',ML+4,y+4);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(B).text(I.cn||'-',ML+4,y+16,{width:c1-8});
    doc.font('Helvetica').fontSize(8.5).fillColor(G).text(I.ca||'',ML+4,y+30,{width:c1-8});
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(B).text('Contact: '+(I.cp||'-'),ML+4,y+58);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(B).text('State: '+sname(I.cs),ML+4,y+70);
    const iX=ML+c1+4;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(B).text('Invoice Details:',iX,y+4);
    [['Invoice No.:',I.invoice_number],['Date:',fmtDate(I.issue_date)],['Time:',fmtTime(I.issue_date)],['Place of Supply:',sname(I.place_of_supply)]].forEach(([lb,vl],i)=>{
      const dy=y+18+i*15;
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(B).text(lb,iX,dy);
      doc.font('Helvetica').fontSize(8.5).fillColor(B).text(vl||'-',iX+92,dy);
    });
    y+=82;

    // TRANSPORT
    dRect(ML,y,CW,22,LG);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(B).text('Transportation Details:',ML+4,y+4);
    doc.font('Helvetica').fontSize(8.5).fillColor(G).text('Transport Name: ________________',ML+4,y+14);
    y+=22;

    // ITEMS TABLE
    const COLS=[{w:20,lb:'#',al:'center'},{w:150,lb:'Item name',al:'left'},{w:62,lb:'HSN/SAC',al:'center'},{w:44,lb:'Quantity',al:'center'},{w:36,lb:'Unit',al:'center'},{w:70,lb:'Price/Unit(Rs.)',al:'right'},{w:82,lb:'GST(Rs.)',al:'right'},{w:71,lb:'Amount(Rs.)',al:'right'}];
    let cx2=ML; COLS.forEach(c=>{c.x=cx2;cx2+=c.w;});
    dRect(ML,y,CW,20,LG);
    COLS.forEach((c,i)=>{ if(i>0)dVL(c.x,y,20); cell(c.lb,c.x,y-1,c.w,{bold:true,sz:8.5,al:c.al}); });
    y+=20;

    let tQ=0,tG=0,tA=0;
    items.forEach((item,idx)=>{
      dRect(ML,y,CW,20,idx%2===1?'#fafafa':'#ffffff');
      const lg=parseFloat(item.cgst_amount||0)+parseFloat(item.sgst_amount||0)+parseFloat(item.igst_amount||0);
      const la=parseFloat(item.line_total)+lg;
      const gp=parseFloat(item.gst_rate||0);
      tQ+=parseInt(item.quantity); tG+=lg; tA+=la;
      const vals=[idx+1,item.pn,item.hsn_code||'-',item.quantity,item.pu||'Pcs',Rs(item.unit_price),Rs(lg)+' ('+gp+'%)',Rs(la)];
      COLS.forEach((c,i)=>{ if(i>0)dVL(c.x,y,20); cell(vals[i],c.x,y-1,c.w,{bold:i===1,sz:8.5,al:c.al}); });
      y+=20;
    });
    dRect(ML,y,CW,20,LG);
    COLS.forEach((c,i)=>{ if(i>0)dVL(c.x,y,20); });
    cell('Total',COLS[1].x,y-1,COLS[1].w,{bold:true,sz:9});
    cell(tQ,COLS[3].x,y-1,COLS[3].w,{bold:true,sz:9,al:'center'});
    cell(Rs(tG),COLS[6].x,y-1,COLS[6].w,{bold:true,sz:9,al:'right'});
    cell(Rs(tA),COLS[7].x,y-1,COLS[7].w,{bold:true,sz:9,al:'right'});
    y+=20;

    // BOTTOM SECTION — Left and Right drawn independently, then synced
    const lW=Math.floor(CW*0.54), rW=CW-lW, rX=ML+lW;
    const bY=y;

    // === LEFT SIDE ===
    let ly=bY;
    // Tax Summary header
    dRect(ML,ly,lW,18,LG);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(B).text('Tax Summary:',ML+4,ly+4);
    ly+=18;

    // Tax table double header
    const TC=[52,75,36,36,36,36,68];
    let tx3=ML; const TX=[]; TC.forEach(w=>{TX.push(tx3);tx3+=w;});
    dRect(ML,ly,lW,28,LG);
    // Row 1
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(B);
    doc.rect(TX[0],ly,TC[0],28).strokeColor(BC).lineWidth(0.5).stroke();
    doc.text('HSN/SAC',TX[0]+2,ly+8,{width:TC[0]-4,align:'center'});
    doc.rect(TX[1],ly,TC[1],28).strokeColor(BC).lineWidth(0.5).stroke();
    doc.text('Taxable\nAmt(Rs.)',TX[1]+2,ly+5,{width:TC[1]-4,align:'center'});
    doc.rect(TX[2],ly,TC[2]+TC[3],14).strokeColor(BC).lineWidth(0.5).stroke();
    doc.text('CGST',TX[2]+2,ly+3,{width:TC[2]+TC[3]-4,align:'center'});
    doc.rect(TX[4],ly,TC[4]+TC[5],14).strokeColor(BC).lineWidth(0.5).stroke();
    doc.text('SGST',TX[4]+2,ly+3,{width:TC[4]+TC[5]-4,align:'center'});
    doc.rect(TX[6],ly,TC[6],28).strokeColor(BC).lineWidth(0.5).stroke();
    doc.text('Total\nTax(Rs.)',TX[6]+2,ly+5,{width:TC[6]-4,align:'center'});
    // Row 2
    const hy2=ly+14;
    [TX[2],TX[3],TX[4],TX[5]].forEach((x,i)=>{ doc.rect(x,hy2,TC[i+2],14).strokeColor(BC).lineWidth(0.5).stroke(); doc.text(['Rate%','Amt','Rate%','Amt'][i],x+2,hy2+3,{width:TC[i+2]-4,align:'center'}); });
    ly+=28;

    // Tax rows
    const gG={};
    items.forEach(it=>{ const h=it.hsn_code||'N/A'; if(!gG[h])gG[h]={ta:0,cg:0,sg:0,rt:parseFloat(it.gst_rate||0)}; gG[h].ta+=parseFloat(it.line_total); gG[h].cg+=parseFloat(it.cgst_amount||0); gG[h].sg+=parseFloat(it.sgst_amount||0); });
    let gT=0,gC=0,gS=0,gTot=0;
    Object.entries(gG).forEach(([h,g])=>{
      const half=(g.rt/2).toFixed(1), tot=g.cg+g.sg;
      gT+=g.ta;gC+=g.cg;gS+=g.sg;gTot+=tot;
      dRect(ML,ly,lW,16,'#ffffff');
      TC.forEach((_,i)=>{ if(i>0)dVL(TX[i],ly,16); });
      doc.font('Helvetica').fontSize(8.5).fillColor(B);
      doc.text(h,TX[0]+2,ly+3,{width:TC[0]-4});
      doc.text(g.ta.toFixed(2),TX[1]+2,ly+3,{width:TC[1]-4,align:'right'});
      doc.text(half,TX[2]+2,ly+3,{width:TC[2]-4,align:'center'});
      doc.text(g.cg.toFixed(2),TX[3]+2,ly+3,{width:TC[3]-4,align:'right'});
      doc.text(half,TX[4]+2,ly+3,{width:TC[4]-4,align:'center'});
      doc.text(g.sg.toFixed(2),TX[5]+2,ly+3,{width:TC[5]-4,align:'right'});
      doc.font('Helvetica-Bold').text(tot.toFixed(2),TX[6]+2,ly+3,{width:TC[6]-4,align:'right'});
      ly+=16;
    });
    // Tax total
    dRect(ML,ly,lW,16,LG);
    TC.forEach((_,i)=>{ if(i>0)dVL(TX[i],ly,16); });
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(B);
    doc.text('TOTAL',TX[0]+2,ly+3,{width:TC[0]-4});
    doc.text(gT.toFixed(2),TX[1]+2,ly+3,{width:TC[1]-4,align:'right'});
    doc.text(gC.toFixed(2),TX[3]+2,ly+3,{width:TC[3]-4,align:'right'});
    doc.text(gS.toFixed(2),TX[5]+2,ly+3,{width:TC[5]-4,align:'right'});
    doc.text(gTot.toFixed(2),TX[6]+2,ly+3,{width:TC[6]-4,align:'right'});
    ly+=16;
    // Payment mode
    dRect(ML,ly,lW,24,LG);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(B).text('Payment Mode:',ML+4,ly+4);
    doc.font('Helvetica').fontSize(8.5).fillColor(B).text(I.notes||'Cash',ML+4,ly+15);
    ly+=24;

    // === RIGHT SIDE ===
    let ry2=bY;
    const lh=18;
    // Sub Total
    dRect(rX,ry2,rW,lh,'#ffffff');
    doc.font('Helvetica').fontSize(9).fillColor(B).text('Sub Total',rX+4,ry2+4,{width:rW*0.52});
    doc.text(':',rX+rW*0.54,ry2+4,{width:12});
    doc.font('Helvetica-Bold').text(Rs(I.subtotal),rX+rW*0.57,ry2+4,{width:rW*0.4,align:'right'});
    ry2+=lh;
    // Total
    dRect(rX,ry2,rW,lh,'#ffffff');
    doc.font('Helvetica-Bold').fontSize(9).fillColor(B).text('Total',rX+4,ry2+4,{width:rW*0.52});
    doc.text(':',rX+rW*0.54,ry2+4,{width:12});
    doc.text(Rs(I.total_amount),rX+rW*0.57,ry2+4,{width:rW*0.4,align:'right'});
    ry2+=lh;
    // Amount in words
    dRect(rX,ry2,rW,30,'#ffffff');
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(B).text('Invoice Amount in Words:',rX+4,ry2+3);
    doc.font('Helvetica').fontSize(8).fillColor(B).text(amtWords(parseFloat(I.total_amount)),rX+4,ry2+14,{width:rW-8});
    ry2+=30;
    // Balance lines
    [['Received',Rs(I.total_amount)],['Balance','Rs. 0.00'],['Previous Balance','Rs. 0.00'],['Current Balance','Rs. 0.00']].forEach(([lb,vl])=>{
      dRect(rX,ry2,rW,lh,'#ffffff');
      doc.font('Helvetica').fontSize(9).fillColor(B).text(lb,rX+4,ry2+4,{width:rW*0.52});
      doc.text(':',rX+rW*0.54,ry2+4,{width:12});
      doc.text(vl,rX+rW*0.57,ry2+4,{width:rW*0.4,align:'right'});
      ry2+=lh;
    });

    // Sync
    y=Math.max(ly,ry2);

    // TERMS
    dRect(ML,y,CW,58,'#ffffff');
    doc.font('Helvetica-Bold').fontSize(9).fillColor(B).text('Terms & Conditions:',ML+4,y+5);
    doc.font('Helvetica').fontSize(8.5).fillColor(G).text('E.& O.E\n1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a will be charged if payment is not made within the stipulated time.\n3. Subject to local jurisdiction only.',ML+4,y+18,{width:CW-8});
    y+=58;

    // SIGNATORY
    dRect(ML,y,CW,62,'#ffffff');
    const sX=ML+CW*0.6, sW=CW*0.38;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(B).text('For '+(I.bn||'Your Company')+':',sX,y+6,{width:sW});
    doc.moveTo(sX+4,y+53).lineTo(ML+CW-4,y+53).strokeColor(BC).lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(8.5).fillColor(G).text('Authorized Signatory',sX+4,y+55,{width:sW-8,align:'center'});
    y+=62;

    doc.end();
  } catch(err){ next(err); }
});

module.exports = router;
