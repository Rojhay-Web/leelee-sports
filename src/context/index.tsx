import { createElement } from 'react';

export default function ContextCompose({ items, children }: {items:any[], children: any}) {
    return items.reduceRight(
      (acc, [Context, props]) =>
        createElement(Context.Provider, props, acc),
        children
    );
}