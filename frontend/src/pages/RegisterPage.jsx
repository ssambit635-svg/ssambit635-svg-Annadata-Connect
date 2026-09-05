import LoginPage from './LoginPage.jsx';

// Registration uses the same verification flow, not an unverified phone form.
export default function RegisterPage() {
  return <LoginPage registration />;
}
