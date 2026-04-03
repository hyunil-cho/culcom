'use client';

import { ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react';
import Link from 'next/link';

type Variant = 'primary' | 'secondary' | 'danger' | 'search' | 'inline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonBaseProps {
  variant?: Variant;
  size?: Size;
  /** btn-inline 색상: success | primary | info | purple */
  inlineColor?: 'success' | 'primary' | 'info' | 'purple';
}

type ButtonProps = ButtonBaseProps & ButtonHTMLAttributes<HTMLButtonElement>;
type LinkButtonProps = ButtonBaseProps & { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;

function buildClassName(variant: Variant = 'primary', size?: Size, inlineColor?: string, extra?: string) {
  const classes: string[] = [];

  if (variant === 'inline') {
    classes.push('btn-inline');
    if (inlineColor) classes.push(`btn-inline-${inlineColor}`);
  } else {
    classes.push(`btn-${variant}`);
  }

  if (size === 'lg') classes.push(`btn-${variant}-large`);
  if (extra) classes.push(extra);
  return classes.join(' ');
}

/** 일반 버튼 */
export function Button({ variant = 'primary', size, inlineColor, className, ...props }: ButtonProps) {
  return <button {...props} className={buildClassName(variant, size, inlineColor, className)} />;
}

/** Link를 버튼처럼 사용 */
export function LinkButton({ variant = 'primary', size, inlineColor, href, className, ...props }: LinkButtonProps) {
  return (
    <Link href={href} {...props}
      className={`${buildClassName(variant, size, inlineColor, className)} btn-nav`} />
  );
}
