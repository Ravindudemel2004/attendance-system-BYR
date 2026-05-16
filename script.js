const STORAGE_KEY = 'attendance_students_v1';

function renderSummary() {
  const summary = document.getElementById('summary');

  const totalStudents = students.length;
  const totalPresent = students.filter(
    student => student.todayStatus === 'Present'
  ).length;
  const totalAbsent = students.filter(
    student => student.todayStatus === 'Absent'
  ).length;
  const totalLate = students.filter(
    student => student.todayStatus === 'Late'
  ).length;

  summary.innerHTML = `
    <strong>Total Students:</strong> ${totalStudents}<br>
    <strong>Present Today:</strong> ${totalPresent}<br>
    <strong>Absent Today:</strong> ${totalAbsent}<br>
    <strong>Late Today:</strong> ${totalLate}
  `;
}

function exportCSV() {
  if (students.length === 0) {
    alert('No data to export.');
    return;
  }

  let csv = 'Name,Present,Absent,Late,Total,Attendance Percentage,Today Status\n';

  students.forEach(student => {
    const total = student.present + student.absent + student.late;
    const percentage = getAttendancePercentage(student);

    csv += `"${student.name}",${student.present},${student.absent},${student.late},${total},${percentage}%,${student.todayStatus}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'attendance_report.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function clearAllData() {
  if (!confirm('Are you sure you want to delete all attendance data?')) {
    return;
  }

  students = [];
  saveData();
  renderStudents();
}

// Initialize the page
window.onload = function () {
  renderStudents();
}; 