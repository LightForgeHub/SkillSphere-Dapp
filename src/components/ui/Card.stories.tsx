import type { Meta, StoryObj } from "@storybook/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./Card";
import { Button } from "./Button";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "glass", "glow"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: (args) => (
    <Card className="w-[350px]" {...args}>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card Description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground/80">
          This is the default card content. It contains descriptive text or
          nested components.
        </p>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline" size="sm">
          Cancel
        </Button>
        <Button size="sm">Submit</Button>
      </CardFooter>
    </Card>
  ),
  args: {
    variant: "default",
  },
};

export const Glass: Story = {
  render: (args) => (
    <div className="p-8 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 rounded-xl">
      <Card className="w-[350px]" {...args}>
        <CardHeader>
          <CardTitle className="text-white">Glass Card</CardTitle>
          <CardDescription className="text-white/60">
            A premium glassmorphism effect
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-white/80">
            This card uses glassmorphism properties like backdrop-blur and a subtle translucent background.
          </p>
        </CardContent>
        <CardFooter className="justify-between">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
            Cancel
          </Button>
          <Button variant="white" size="sm">
            Action
          </Button>
        </CardFooter>
      </Card>
    </div>
  ),
  args: {
    variant: "glass",
  },
};

export const Glow: Story = {
  render: (args) => (
    <Card className="w-[350px]" {...args}>
      <CardHeader>
        <CardTitle>Glow Card</CardTitle>
        <CardDescription>Glow effects on hover and borders</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground/80">
          Hover over this card to see the glow effects animate.
        </p>
      </CardContent>
      <CardFooter className="justify-end">
        <Button variant="glow" size="sm">
          Explore
        </Button>
      </CardFooter>
    </Card>
  ),
  args: {
    variant: "glow",
  },
};
