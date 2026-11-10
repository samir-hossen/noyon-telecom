import { Link } from 'react-router-dom';

// Useful, crawlable homepage copy and direct internal links. This mirrors how
// strong commerce homepages explain their offer and lead both people and
// search engines into the catalogue, without adding another API request or
// any JavaScript dependency to the critical path.
export default function HomeSeoContent() {
  return (
    <section className="section container home-seo-content" aria-labelledby="home-seo-heading">
      <div className="home-seo-copy">
        <h2 id="home-seo-heading">Wholesale mobile phone spare parts in Bangladesh</h2>
        <p>
          Noyon Telecom supplies repair shops, service centres and dealers with mobile phone
          spare parts for popular Apple, Samsung, Xiaomi, Oppo, Vivo, Realme, Tecno and Infinix
          models. Find the exact part by brand, phone model or part type and request a dealer quote
          directly from the product page.
        </p>
      </div>

      <div className="home-seo-grid">
        <div>
          <h3>Shop replacement parts</h3>
          <p>Browse commonly requested repair parts with clear compatibility and product photos.</p>
          <nav aria-label="Popular spare-part categories">
            <Link to="/category/display">Mobile displays</Link>
            <Link to="/category/back-glass">Back glass</Link>
            <Link to="/category/charging-port">Charging ports</Link>
            <Link to="/category/camera">Mobile cameras</Link>
            <Link to="/category/sim-tray">SIM trays</Link>
            <Link to="/category/speaker">Speakers</Link>
          </nav>
        </div>

        <div>
          <h3>Parts for leading phone brands</h3>
          <p>Use a brand page to reach its available models and every compatible part faster.</p>
          <nav aria-label="Popular mobile phone brands">
            <Link to="/brand/apple">iPhone parts</Link>
            <Link to="/brand/samsung">Samsung parts</Link>
            <Link to="/brand/xiaomi">Xiaomi parts</Link>
            <Link to="/brand/oppo">Oppo parts</Link>
            <Link to="/brand/vivo">Vivo parts</Link>
            <Link to="/brand/realme">Realme parts</Link>
          </nav>
        </div>

        <div>
          <h3>Built for repair businesses</h3>
          <p>
            Products are checked before dispatch, with delivery across Bangladesh and support for
            bulk requirements. New dealers can create an account or contact us before ordering.
          </p>
          <nav aria-label="Dealer and customer information">
            <Link to="/register">Become a dealer</Link>
            <Link to="/delivery-policy">Delivery information</Link>
            <Link to="/warranty-policy">Warranty policy</Link>
            <Link to="/contact">Contact Noyon Telecom</Link>
          </nav>
        </div>
      </div>
    </section>
  );
}
