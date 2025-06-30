import React from 'react';

export interface ProductCardProps {
  title: string;
  price: number;
  image: string;
  onAddToCart: () => void;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

const ProductCard: React.FC<ProductCardProps> = ({
  title,
  price,
  image,
  onAddToCart,
  className = '',
  style = {},
  children,
}) => {
  const defaultStyles: React.CSSProperties = {
    borderRadius: 12,
    boxShadow: '0 2px 8px #0001',
    background: '#fff',
    padding: 20,
    minWidth: 220,
    maxWidth: 320,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    border: '1px solid #eee',
  };
  return (
    <div className={className} style={{ ...defaultStyles, ...style }}>
      <img src={image} alt={title} style={{ width: 80, height: 80, marginBottom: 16 }} />
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{title}</div>
      <div style={{ fontWeight: 600, color: '#2681cc', marginBottom: 12 }}>{price} ICP</div>
      {children}
      <button style={{ marginTop: 12, padding: '8px 20px', borderRadius: 6, background: '#0070f3', color: '#fff', border: 'none', fontWeight: 600 }} onClick={onAddToCart}>
        Add to Cart
      </button>
    </div>
  );
};

export default ProductCard;
