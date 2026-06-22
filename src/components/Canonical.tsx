import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const Canonical = () => {
  const { pathname, search } = useLocation();

  // Remove UTM e outros parametros de tracking da URL canonica
  const cleanSearch = search
    ? "?" + search
        .replace("?", "")
        .split("&")
        .filter(p => !p.startsWith("utm_") && !p.startsWith("coupon") && !p.startsWith("gclid") && !p.startsWith("fbclid"))
        .join("&")
    : "";

  const url = `${window.location.origin}${pathname}${cleanSearch}`;

  return (
    <Helmet>
      <link rel="canonical" href={url} />
    </Helmet>
  );
};

export default Canonical;
