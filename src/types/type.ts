export interface JWTPayload {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  [key: string]: any; // เผื่อฟิลด์อื่นๆ ในอนาคต
}

export interface UserProps {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  [key: string]: any; // เผื่อฟิลด์อื่นๆ ในอนาคต
}
