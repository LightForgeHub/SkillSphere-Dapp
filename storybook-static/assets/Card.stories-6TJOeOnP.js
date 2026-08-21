import{r}from"./index-CaMInrNI.js";import{c as R}from"./index-CG6ftxoX.js";import{c as a}from"./utils-CWoLqbEm.js";import{B as n}from"./Button-EaaLmeQT.js";const _=R("rounded-xl transition-all duration-300",{variants:{variant:{default:"bg-card text-card-foreground border-border/50 border",glass:"glass text-card-foreground border-white/20 border-2 backdrop-blur-2xl bg-white/5",glow:"bg-card text-card-foreground border-primary/40 border-2 shadow-[0_0_20px_rgba(157,80,255,0.15)] hover:border-primary hover:shadow-glow glow-hover"}},defaultVariants:{variant:"default"}});function s({className:e,variant:t,...E}){return r.createElement("div",{"data-slot":"card",className:a(_({variant:t}),e),...E})}function l({className:e,...t}){return r.createElement("div",{"data-slot":"card-header",className:a("flex flex-col space-y-1.5 p-6",e),...t})}function i({className:e,...t}){return r.createElement("h3",{"data-slot":"card-title",className:a("text-xl font-bold leading-none tracking-tight",e),...t})}function m({className:e,...t}){return r.createElement("p",{"data-slot":"card-description",className:a("text-sm text-muted-foreground",e),...t})}function p({className:e,...t}){return r.createElement("div",{"data-slot":"card-content",className:a("p-6 pt-0",e),...t})}function u({className:e,...t}){return r.createElement("div",{"data-slot":"card-footer",className:a("flex items-center p-6 pt-0",e),...t})}s.__docgenInfo={description:"",methods:[],displayName:"Card",composes:["VariantProps"]};l.__docgenInfo={description:"",methods:[],displayName:"CardHeader"};u.__docgenInfo={description:"",methods:[],displayName:"CardFooter"};i.__docgenInfo={description:"",methods:[],displayName:"CardTitle"};m.__docgenInfo={description:"",methods:[],displayName:"CardDescription"};p.__docgenInfo={description:"",methods:[],displayName:"CardContent"};const z={title:"UI/Card",component:s,tags:["autodocs"],argTypes:{variant:{control:"select",options:["default","glass","glow"]}}},o={render:e=>React.createElement(s,{className:"w-[350px]",...e},React.createElement(l,null,React.createElement(i,null,"Card Title"),React.createElement(m,null,"Card Description goes here")),React.createElement(p,null,React.createElement("p",{className:"text-sm text-foreground/80"},"This is the default card content. It contains descriptive text or nested components.")),React.createElement(u,{className:"justify-between"},React.createElement(n,{variant:"outline",size:"sm"},"Cancel"),React.createElement(n,{size:"sm"},"Submit"))),args:{variant:"default"}},c={render:e=>React.createElement("div",{className:"p-8 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 rounded-xl"},React.createElement(s,{className:"w-[350px]",...e},React.createElement(l,null,React.createElement(i,{className:"text-white"},"Glass Card"),React.createElement(m,{className:"text-white/60"},"A premium glassmorphism effect")),React.createElement(p,null,React.createElement("p",{className:"text-sm text-white/80"},"This card uses glassmorphism properties like backdrop-blur and a subtle translucent background.")),React.createElement(u,{className:"justify-between"},React.createElement(n,{variant:"ghost",size:"sm",className:"text-white hover:bg-white/10"},"Cancel"),React.createElement(n,{variant:"white",size:"sm"},"Action")))),args:{variant:"glass"}},d={render:e=>React.createElement(s,{className:"w-[350px]",...e},React.createElement(l,null,React.createElement(i,null,"Glow Card"),React.createElement(m,null,"Glow effects on hover and borders")),React.createElement(p,null,React.createElement("p",{className:"text-sm text-foreground/80"},"Hover over this card to see the glow effects animate.")),React.createElement(u,{className:"justify-end"},React.createElement(n,{variant:"glow",size:"sm"},"Explore"))),args:{variant:"glow"}};var g,C,f;o.parameters={...o.parameters,docs:{...(g=o.parameters)==null?void 0:g.docs,source:{originalSource:`{
  render: args => <Card className="w-[350px]" {...args}>\r
      <CardHeader>\r
        <CardTitle>Card Title</CardTitle>\r
        <CardDescription>Card Description goes here</CardDescription>\r
      </CardHeader>\r
      <CardContent>\r
        <p className="text-sm text-foreground/80">\r
          This is the default card content. It contains descriptive text or\r
          nested components.\r
        </p>\r
      </CardContent>\r
      <CardFooter className="justify-between">\r
        <Button variant="outline" size="sm">\r
          Cancel\r
        </Button>\r
        <Button size="sm">Submit</Button>\r
      </CardFooter>\r
    </Card>,
  args: {
    variant: "default"
  }
}`,...(f=(C=o.parameters)==null?void 0:C.docs)==null?void 0:f.source}}};var h,x,w;c.parameters={...c.parameters,docs:{...(h=c.parameters)==null?void 0:h.docs,source:{originalSource:`{
  render: args => <div className="p-8 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 rounded-xl">\r
      <Card className="w-[350px]" {...args}>\r
        <CardHeader>\r
          <CardTitle className="text-white">Glass Card</CardTitle>\r
          <CardDescription className="text-white/60">\r
            A premium glassmorphism effect\r
          </CardDescription>\r
        </CardHeader>\r
        <CardContent>\r
          <p className="text-sm text-white/80">\r
            This card uses glassmorphism properties like backdrop-blur and a subtle translucent background.\r
          </p>\r
        </CardContent>\r
        <CardFooter className="justify-between">\r
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">\r
            Cancel\r
          </Button>\r
          <Button variant="white" size="sm">\r
            Action\r
          </Button>\r
        </CardFooter>\r
      </Card>\r
    </div>,
  args: {
    variant: "glass"
  }
}`,...(w=(x=c.parameters)==null?void 0:x.docs)==null?void 0:w.source}}};var v,N,b;d.parameters={...d.parameters,docs:{...(v=d.parameters)==null?void 0:v.docs,source:{originalSource:`{
  render: args => <Card className="w-[350px]" {...args}>\r
      <CardHeader>\r
        <CardTitle>Glow Card</CardTitle>\r
        <CardDescription>Glow effects on hover and borders</CardDescription>\r
      </CardHeader>\r
      <CardContent>\r
        <p className="text-sm text-foreground/80">\r
          Hover over this card to see the glow effects animate.\r
        </p>\r
      </CardContent>\r
      <CardFooter className="justify-end">\r
        <Button variant="glow" size="sm">\r
          Explore\r
        </Button>\r
      </CardFooter>\r
    </Card>,
  args: {
    variant: "glow"
  }
}`,...(b=(N=d.parameters)==null?void 0:N.docs)==null?void 0:b.source}}};const G=["Default","Glass","Glow"];export{o as Default,c as Glass,d as Glow,G as __namedExportsOrder,z as default};
