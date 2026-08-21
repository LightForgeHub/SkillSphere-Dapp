import{B as pr}from"./Button-EaaLmeQT.js";import{r as o}from"./index-CaMInrNI.js";import"./utils-CWoLqbEm.js";import"./index-CG6ftxoX.js";/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gr=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),hr=e=>e.replace(/^([A-Z])|[\s-_]+(\w)/g,(r,a,t)=>t?t.toUpperCase():a.toLowerCase()),b=e=>{const r=hr(e);return r.charAt(0).toUpperCase()+r.slice(1)},cr=(...e)=>e.filter((r,a,t)=>!!r&&r.trim()!==""&&t.indexOf(r)===a).join(" ").trim(),Br=e=>{for(const r in e)if(r.startsWith("aria-")||r==="role"||r==="title")return!0};/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var vr={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wr=o.forwardRef(({color:e="currentColor",size:r=24,strokeWidth:a=2,absoluteStrokeWidth:t,className:y="",children:s,iconNode:lr,...S},dr)=>o.createElement("svg",{ref:dr,...vr,width:r,height:r,stroke:e,strokeWidth:t?Number(a)*24/Number(r):a,className:cr("lucide",y),...!s&&!Br(S)&&{"aria-hidden":"true"},...S},[...lr.map(([ur,mr])=>o.createElement(ur,mr)),...Array.isArray(s)?s:[s]]));/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ir=(e,r)=>{const a=o.forwardRef(({className:t,...y},s)=>o.createElement(wr,{ref:s,iconNode:r,className:cr(`lucide-${gr(b(e))}`,`lucide-${e}`,t),...y}));return a.displayName=b(e),a};/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yr=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]],Sr=ir("arrow-right",yr);/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const br=[["path",{d:"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7",key:"132q7q"}],["rect",{x:"2",y:"4",width:"20",height:"16",rx:"2",key:"izxlao"}]],kr=ir("mail",br),xr={title:"UI/Button",component:pr,tags:["autodocs"],argTypes:{variant:{control:"select",options:["primary","secondary","outline","ghost","link","white","glow","destructive"]},size:{control:"select",options:["default","sm","lg","icon"]},disabled:{control:"boolean"},asChild:{table:{disable:!0}}}},n={args:{variant:"primary",children:"Primary Button"}},c={args:{variant:"secondary",children:"Secondary Button"}},i={args:{variant:"outline",children:"Outline Button"}},l={args:{variant:"ghost",children:"Ghost Button"}},d={args:{variant:"link",children:"Link Button"}},u={args:{variant:"white",children:"White Button"}},m={args:{variant:"glow",children:"Glow Button"}},p={args:{variant:"destructive",children:"Destructive Button"}},g={args:{size:"sm",children:"Small Button"}},h={args:{size:"lg",children:"Large Button"}},B={args:{size:"icon",children:React.createElement(kr,{className:"size-4"}),"aria-label":"Email"}},v={args:{children:React.createElement(React.Fragment,null,"Get Started ",React.createElement(Sr,{className:"size-4"}))}},w={args:{disabled:!0,children:"Disabled Button"}};var k,f,C;n.parameters={...n.parameters,docs:{...(k=n.parameters)==null?void 0:k.docs,source:{originalSource:`{
  args: {
    variant: "primary",
    children: "Primary Button"
  }
}`,...(C=(f=n.parameters)==null?void 0:f.docs)==null?void 0:C.source}}};var L,z,x;c.parameters={...c.parameters,docs:{...(L=c.parameters)==null?void 0:L.docs,source:{originalSource:`{
  args: {
    variant: "secondary",
    children: "Secondary Button"
  }
}`,...(x=(z=c.parameters)==null?void 0:z.docs)==null?void 0:x.source}}};var E,G,A;i.parameters={...i.parameters,docs:{...(E=i.parameters)==null?void 0:E.docs,source:{originalSource:`{
  args: {
    variant: "outline",
    children: "Outline Button"
  }
}`,...(A=(G=i.parameters)==null?void 0:G.docs)==null?void 0:A.source}}};var D,R,W;l.parameters={...l.parameters,docs:{...(D=l.parameters)==null?void 0:D.docs,source:{originalSource:`{
  args: {
    variant: "ghost",
    children: "Ghost Button"
  }
}`,...(W=(R=l.parameters)==null?void 0:R.docs)==null?void 0:W.source}}};var I,N,_;d.parameters={...d.parameters,docs:{...(I=d.parameters)==null?void 0:I.docs,source:{originalSource:`{
  args: {
    variant: "link",
    children: "Link Button"
  }
}`,...(_=(N=d.parameters)==null?void 0:N.docs)==null?void 0:_.source}}};var O,P,$;u.parameters={...u.parameters,docs:{...(O=u.parameters)==null?void 0:O.docs,source:{originalSource:`{
  args: {
    variant: "white",
    children: "White Button"
  }
}`,...($=(P=u.parameters)==null?void 0:P.docs)==null?void 0:$.source}}};var q,M,U;m.parameters={...m.parameters,docs:{...(q=m.parameters)==null?void 0:q.docs,source:{originalSource:`{
  args: {
    variant: "glow",
    children: "Glow Button"
  }
}`,...(U=(M=m.parameters)==null?void 0:M.docs)==null?void 0:U.source}}};var j,Z,F;p.parameters={...p.parameters,docs:{...(j=p.parameters)==null?void 0:j.docs,source:{originalSource:`{
  args: {
    variant: "destructive",
    children: "Destructive Button"
  }
}`,...(F=(Z=p.parameters)==null?void 0:Z.docs)==null?void 0:F.source}}};var K,T,H;g.parameters={...g.parameters,docs:{...(K=g.parameters)==null?void 0:K.docs,source:{originalSource:`{
  args: {
    size: "sm",
    children: "Small Button"
  }
}`,...(H=(T=g.parameters)==null?void 0:T.docs)==null?void 0:H.source}}};var J,Q,V;h.parameters={...h.parameters,docs:{...(J=h.parameters)==null?void 0:J.docs,source:{originalSource:`{
  args: {
    size: "lg",
    children: "Large Button"
  }
}`,...(V=(Q=h.parameters)==null?void 0:Q.docs)==null?void 0:V.source}}};var X,Y,rr;B.parameters={...B.parameters,docs:{...(X=B.parameters)==null?void 0:X.docs,source:{originalSource:`{
  args: {
    size: "icon",
    children: <Mail className="size-4" />,
    "aria-label": "Email"
  }
}`,...(rr=(Y=B.parameters)==null?void 0:Y.docs)==null?void 0:rr.source}}};var er,ar,tr;v.parameters={...v.parameters,docs:{...(er=v.parameters)==null?void 0:er.docs,source:{originalSource:`{
  args: {
    children: <>\r
        Get Started <ArrowRight className="size-4" />\r
      </>
  }
}`,...(tr=(ar=v.parameters)==null?void 0:ar.docs)==null?void 0:tr.source}}};var sr,or,nr;w.parameters={...w.parameters,docs:{...(sr=w.parameters)==null?void 0:sr.docs,source:{originalSource:`{
  args: {
    disabled: true,
    children: "Disabled Button"
  }
}`,...(nr=(or=w.parameters)==null?void 0:or.docs)==null?void 0:nr.source}}};const Er=["Primary","Secondary","Outline","Ghost","Link","White","Glow","Destructive","Small","Large","IconButton","WithIcon","Disabled"];export{p as Destructive,w as Disabled,l as Ghost,m as Glow,B as IconButton,h as Large,d as Link,i as Outline,n as Primary,c as Secondary,g as Small,u as White,v as WithIcon,Er as __namedExportsOrder,xr as default};
