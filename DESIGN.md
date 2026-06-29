# Shivam Kirana Store - SaaS Redesign Guidelines

This document outlines the visual system, design tokens, and components for the Shivam Kirana Store redesign. Inspired by Linear, Notion, and Vercel, the design optimizes readability, spacing, and modern UI transitions while preserving the existing brand color palette.

## 🎨 Color System (Preserved)

- **Primary (Brand Emerald)**: `#10B981` (emerald-500)
- **Primary Hover**: `#059669` (emerald-600)
- **Secondary (Dark Slate / Deep Ink)**: `#0F172A` (slate-900)
- **Accent (Orange Alert/Credit)**: `#F97316` (orange-500)
- **Background**: `#F8FAFC` (slate-50)
- **Surface**: `#FFFFFF` (white)
- **Borders**: `#E2E8F0` (slate-200) or `#F1F5F9` (slate-100)
- **Text Primary**: `#111827` (slate-900)
- **Text Secondary**: `#6B7280` (slate-500)

## 📐 Layout & Spacing

- **Margins & Padding**:
  - Main containers use `p-6` (24px) or `p-8` (32px) on desktop, and `p-4` (16px) on mobile.
  - Spacing between sections is kept tight and clean using `space-y-6`.
- **Grid Layouts**:
  - Metric cards: 4 columns on large screens, 2 columns on tablets, 1 column on mobile (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6`).
  - Charts section: 3-column grid (`grid-cols-1 lg:grid-cols-3 gap-6`), with weekly trend spanning 2 columns and distribution spanning 1.

## 🔠 Typography

- **Headlines**: Use `Geist` or `Poppins` font. Bold, tight line-heights, tracking-tight (`tracking-tight font-extrabold`).
- **Body & Captions**: Use `Inter`. Line-height is adjusted (`leading-relaxed` or `leading-normal`).
- **Labels**: Small uppercase labels with tracking-wider and font-semibold. E.g., `text-[10px] font-semibold text-slate-400 uppercase tracking-wider`.
- **Numerical Values**: Use monospace font alignment (`font-mono`) or `font-variant-numeric: tabular-nums` for credit, earnings, and balance quantities to ensure uniform vertical alignment.

## 🎴 Cards & Visual Hierarchy

- **Border & Shadows**:
  - Replace large `rounded-3xl` corners with modern, clean `rounded-xl` (12px).
  - Use subtle `shadow-sm` or thin `1px` borders instead of heavy dropshadows.
- **Interactions**:
  - Hover animations: Subtle lift `hover:-translate-y-0.5 hover:border-slate-350 hover:shadow-md transition-all duration-200 ease-in-out`.
  - Buttons: Standardize buttons with `rounded-lg` or `rounded-xl` shapes, thin borders, and crisp text alignment.

## ⌛ Loading & Empty States

- **Skeletons**:
  - Custom structured pulse elements mapping directly to card titles, metrics, chart blocks, and table rows to eliminate layout shifting.
- **Empty States**:
  - Minimalist layout containing a light gray icon, clean text header, supportive subtitle, and direct action triggers.
