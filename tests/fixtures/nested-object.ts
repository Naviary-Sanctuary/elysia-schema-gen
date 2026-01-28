export class UserProfile {
  id: string;
  name: string;
  address: {
    street: string;
    city: string;
    zipCode: number;
  };
}
