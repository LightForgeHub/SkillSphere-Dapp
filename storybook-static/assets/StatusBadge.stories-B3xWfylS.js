import{r as q}from"./index-CaMInrNI.js";import{B as z}from"./Badge-CAVrf4iS.js";import{c as F}from"./utils-CWoLqbEm.js";import"./index-CG6ftxoX.js";const G={resolved:{label:"Resolved",variant:"success"},pending:{label:"Pending",variant:"warning"},completed:{label:"Completed",variant:"info"},published:{label:"Published",variant:"published"},draft:{label:"Draft",variant:"draft"}};function _({status:l,className:R,...T}){const k=l.toLowerCase(),d=G[k]??{label:l,variant:"outline"};return q.createElement(z,{variant:d.variant,className:F("capitalize font-medium align-middle text-xs px-3 py-1 rounded-full",R),...T},d.label)}_.__docgenInfo={description:"",methods:[],displayName:"StatusBadge",props:{status:{required:!0,tsType:{name:"union",raw:"StatusVariant | CourseStatus | string",elements:[{name:"union",raw:`| "resolved"\r
| "pending"\r
| "completed"\r
| "published"\r
| "draft"`,elements:[{name:"literal",value:'"resolved"'},{name:"literal",value:'"pending"'},{name:"literal",value:'"completed"'},{name:"literal",value:'"published"'},{name:"literal",value:'"draft"'}]},{name:"union",raw:'"Published" | "Draft"',elements:[{name:"literal",value:'"Published"'},{name:"literal",value:'"Draft"'}]},{name:"string"}]},description:""},className:{required:!1,tsType:{name:"string"},description:""}}};const V={title:"UI/StatusBadge",component:_,tags:["autodocs"],argTypes:{status:{control:"text"}}},e={args:{status:"resolved"}},a={args:{status:"pending"}},s={args:{status:"completed"}},r={args:{status:"published"}},t={args:{status:"draft"}},n={args:{status:"PENDING"}},o={args:{status:"In Progress"}};var i,c,u;e.parameters={...e.parameters,docs:{...(i=e.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    status: "resolved"
  }
}`,...(u=(c=e.parameters)==null?void 0:c.docs)==null?void 0:u.source}}};var m,p,g;a.parameters={...a.parameters,docs:{...(m=a.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    status: "pending"
  }
}`,...(g=(p=a.parameters)==null?void 0:p.docs)==null?void 0:g.source}}};var v,f,b;s.parameters={...s.parameters,docs:{...(v=s.parameters)==null?void 0:v.docs,source:{originalSource:`{
  args: {
    status: "completed"
  }
}`,...(b=(f=s.parameters)==null?void 0:f.docs)==null?void 0:b.source}}};var S,h,P;r.parameters={...r.parameters,docs:{...(S=r.parameters)==null?void 0:S.docs,source:{originalSource:`{
  args: {
    status: "published"
  }
}`,...(P=(h=r.parameters)==null?void 0:h.docs)==null?void 0:P.source}}};var C,I,x;t.parameters={...t.parameters,docs:{...(C=t.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args: {
    status: "draft"
  }
}`,...(x=(I=t.parameters)==null?void 0:I.docs)==null?void 0:x.source}}};var D,N,w;n.parameters={...n.parameters,docs:{...(D=n.parameters)==null?void 0:D.docs,source:{originalSource:`{
  args: {
    status: "PENDING"
  }
}`,...(w=(N=n.parameters)==null?void 0:N.docs)==null?void 0:w.source}}};var y,B,E;o.parameters={...o.parameters,docs:{...(y=o.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    status: "In Progress"
  }
}`,...(E=(B=o.parameters)==null?void 0:B.docs)==null?void 0:E.source}}};const j=["Resolved","Pending","Completed","Published","Draft","CaseInsensitive","CustomFallback"];export{n as CaseInsensitive,s as Completed,o as CustomFallback,t as Draft,a as Pending,r as Published,e as Resolved,j as __namedExportsOrder,V as default};
