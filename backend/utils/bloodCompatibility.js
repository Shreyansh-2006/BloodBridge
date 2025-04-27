// backend/utils/bloodCompatibility.js

// Blood compatibility chart for transfusions
// Key = recipient blood type, Value = array of compatible donor blood types
const bloodCompatibilityChart = {
    'A+': ['A+', 'A-', 'O+', 'O-'],
    'A-': ['A-', 'O-'],
    'B+': ['B+', 'B-', 'O+', 'O-'],
    'B-': ['B-', 'O-'],
    'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'], // Universal recipient
    'AB-': ['AB-', 'A-', 'B-', 'O-'],
    'O+': ['O+', 'O-'],
    'O-': ['O-'] // Universal donor
  };
  
  // Reverse compatibility chart (who can receive from a specific blood type)
  // Key = donor blood type, Value = array of compatible recipient blood types
  const reverseBloodCompatibilityChart = {
    'A+': ['A+', 'AB+'],
    'A-': ['A+', 'A-', 'AB+', 'AB-'],
    'B+': ['B+', 'AB+'],
    'B-': ['B+', 'B-', 'AB+', 'AB-'],
    'AB+': ['AB+'],
    'AB-': ['AB+', 'AB-'],
    'O+': ['A+', 'B+', 'AB+', 'O+'],
    'O-': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  };
  
  // Get compatible donor blood types for a recipient
  exports.getCompatibleDonors = (recipientBloodType) => {
    return bloodCompatibilityChart[recipientBloodType] || [];
  };
  
  // Get compatible recipient blood types for a donor
  exports.getCompatibleRecipients = (donorBloodType) => {
    return reverseBloodCompatibilityChart[donorBloodType] || [];
  };
  
  // Check if donor blood type is compatible with recipient blood type
  exports.isCompatible = (donorBloodType, recipientBloodType) => {
    const compatibleDonors = bloodCompatibilityChart[recipientBloodType] || [];
    return compatibleDonors.includes(donorBloodType);
  };