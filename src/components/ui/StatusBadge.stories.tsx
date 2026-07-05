import type { Meta, StoryObj } from "@storybook/react";
import { StatusBadge } from "./StatusBadge";

const meta: Meta<typeof StatusBadge> = {
  title: "UI/StatusBadge",
  component: StatusBadge,
  tags: ["autodocs"],
  argTypes: {
    status: {
      control: "text",
    },
  },
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Resolved: Story = {
  args: {
    status: "resolved",
  },
};

export const Pending: Story = {
  args: {
    status: "pending",
  },
};

export const Completed: Story = {
  args: {
    status: "completed",
  },
};

export const Published: Story = {
  args: {
    status: "published",
  },
};

export const Draft: Story = {
  args: {
    status: "draft",
  },
};

export const CaseInsensitive: Story = {
  args: {
    status: "PENDING",
  },
};

export const CustomFallback: Story = {
  args: {
    status: "In Progress",
  },
};
