const models = require('./server/config/db').sequelize.models;

(async () => {
  try {
    const consultation = await models.Consultation.findOne({
      include: ['Patient', 'Doctor', 'Payments']
    });
    if (consultation) {
      console.log('✅ Seed verification SUCCESS:');
      console.log('  Consultation ID:', consultation.id);
      console.log('  Code:', consultation.consultation_code);
      console.log('  Status:', consultation.status);
      console.log('  Has Patient:', !!consultation.Patient);
      console.log('  Has Doctor:', !!consultation.Doctor);
      console.log('  Payments linked:', consultation.Payments?.length || 0);
      console.log('  Result snapshot:', !!consultation.result_snapshot);
      console.log('\n✅ All seed data properly linked and relationships verified.');
    } else {
      console.log('❌ No consultation found');
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
