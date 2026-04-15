const TARGET_INFO_FIELDS = [
  'unit_id',
  'Status',
  'Country',
  'CATEGORY_OLD',
  'ProductType',
  'CODE',
];

export default function InfoWindow({ properties }) {
  if (!properties) {
    return (
      <div className="info-window">
        <h3>PGI / PDO Info Window</h3>
        <p>Click on a PGI or PDO area for details.</p>
      </div>
    );
  }

  const productName = properties['Name']
    ? properties['Name'].split('/')[0].trim()
    : '';

  return (
    <div className="info-window">
      <h3>{productName}, {properties['Country']}</h3>
      {TARGET_INFO_FIELDS.map((field) =>
        properties[field] !== undefined ? (
          <p key={field}>{properties[field]}</p>
        ) : null
      )}
    </div>
  );
}
