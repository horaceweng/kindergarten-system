// src/pages/admin/StudentManagementTab.tsx
import React, { useState, useEffect } from 'react';
import { 
  Box, Button, TextField, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Select, IconButton, Alert, Typography, 
  
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import EditIcon from '@mui/icons-material/Edit';
import * as api from '../../services/api';

  interface Enrollment {
    id: number;
    studentId: number;
    classId: number;
    schoolYear: string;
    gradeId?: number;
  }

  interface Student {
    id: number;
    studentId: string;
    name: string;
    birthday: string;
    gender: 'male' | 'female' | 'other';
    status: 'active' | 'transferred_out' | 'graduated' | 'suspended';
    enrollmentDate: string;
    departureDate: string | null;
    departureReason: string | null;
    enrollments: Enrollment[];
  }interface Class {
  id: number;
  name: string;
}

const StudentManagementTab: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [dialogMode, setDialogMode] = useState<'new' | 'transfer' | 'update'>('new');
  
  // 可用班級列表
  const [classes, setClasses] = useState<Class[]>([]);
  const [grades, setGrades] = useState<{id:number, name:string}[]>([]);
  
  // 過濾的班級列表，用於根據不同模式顯示不同的班級選項
  const [filteredClasses, setFilteredClasses] = useState<Class[]>([]);
  
  // 學生表單
  const [studentForm, setStudentForm] = useState({
    // studentId removed per request
    name: '',
    birthday: new Date().toISOString().split('T')[0],
    gender: 'male' as 'male' | 'female' | 'other',
    status: 'active' as 'active' | 'transferred_out' | 'graduated' | 'suspended',
    enrollmentDate: new Date().toISOString().split('T')[0],
    departureDate: '' as string | null,
    departureReason: '' as string | null,
    classId: '' as string | number, // 新增: 班級選擇
    gradeId: '' as string | number // 年級選擇
  });

  // 從API獲取資料
  // 獲取一年級班級的函數
  // ...existing code...

  const gradeNameToLabel = (name: string) => {
    switch (name) {
      case 'NURSERY':
        return '幼幼班';
      case 'K1':
        return '小班';
      case 'K2':
        return '中班';
      case 'K3':
        return '大班';
      default:
        return name;
    }
  };
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 同時獲取學生列表、班級列表與年級列表
        const [studentsResponse, classesResponse, gradesResponse] = await Promise.all([
          api.getStudents({ 
            status: filterStatus !== 'all' ? filterStatus : undefined,
            includeEnrollments: true  // 請求包含班級註冊信息
          }),
          api.getClasses(),
          api.getGrades()
        ]);
        
        setStudents(studentsResponse.data);
        
        // 獲取所有班級
        const allClasses = classesResponse.data;
        setClasses(allClasses);
        
        // 默認顯示所有班級（如果 dialog 已開且為新增/轉入/更新則預設選項）
        if (dialogOpen && (dialogMode === 'new' || dialogMode === 'transfer' || dialogMode === 'update')) {
          setFilteredClasses(allClasses);
        }
        
        // keep filteredClasses as set by the dialog open handlers
        // 年級
        setGrades(gradesResponse.data || []);
      } catch (err) {
        setError("獲取資料失敗");
        console.error(err);
      } finally {
      }
    };
    
    fetchData();
  }, [filterStatus, dialogMode, dialogOpen]);

  const handleFilterStatusChange = (e: SelectChangeEvent) => {
    setFilterStatus(e.target.value);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setStudentForm({
      ...studentForm,
      [name]: value
    });
  };
  
  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setStudentForm({
      ...studentForm,
      [name]: value
    });
  };

  const openAddDialog = async () => {
    setCurrentStudent(null);
    setDialogMode('new');
    // Ensure classes are loaded; if not, fetch them so dropdown is populated
    if (!classes || classes.length === 0) {
      try {
        const classesResponse = await api.getClasses();
        setClasses(classesResponse.data);
        setFilteredClasses(classesResponse.data);
      } catch (err) {
        console.error('Failed to load classes for add dialog', err);
        setFilteredClasses([]);
      }
    } else {
      setFilteredClasses(classes);
    }
    setStudentForm({
      name: '',
      birthday: new Date().toISOString().split('T')[0],
      gender: 'male',
      status: 'active',
      enrollmentDate: new Date().toISOString().split('T')[0],
      departureDate: null,
      departureReason: null,
      classId: '',
      gradeId: ''
    });
    
    setDialogOpen(true);
  };
  
  const openTransferDialog = async () => {
    setCurrentStudent(null);
    setDialogMode('transfer');
    setStudentForm({
      name: '',
      birthday: new Date().toISOString().split('T')[0],
      gender: 'male',
      status: 'active',
      enrollmentDate: new Date().toISOString().split('T')[0],
      departureDate: null,
      departureReason: null,
      classId: '', // 初始化為空
      gradeId: ''
    });
    
    // 轉入學生可以選擇所有班級; ensure classes loaded
    if (!classes || classes.length === 0) {
      try {
        const classesResponse = await api.getClasses();
        setClasses(classesResponse.data);
        setFilteredClasses(classesResponse.data);
      } catch (err) {
        console.error('Failed to load classes for transfer dialog', err);
        setFilteredClasses([]);
      }
    } else {
      setFilteredClasses(classes);
    }
    
    setDialogOpen(true);
  };
  
  const openUpdateStatusDialog = async (student: Student) => {
    setCurrentStudent(student);
    setDialogMode('update');
    // 找出學生的最新班級註冊（如果有）
    const currentClassId = student.enrollments && student.enrollments.length > 0 
      ? student.enrollments[0].classId 
      : '';
      
  // Prefill gradeId from the student's latest enrollment if available
  const currentGradeId = student.enrollments && student.enrollments.length > 0 ? student.enrollments[0].gradeId : '';
    setStudentForm({
      name: student.name,
      birthday: student.birthday,
      gender: student.gender,
      status: student.status,
      enrollmentDate: student.enrollmentDate,
      departureDate: student.departureDate,
      departureReason: student.departureReason,
      classId: currentClassId,
      gradeId: currentGradeId || ''
    });
    // allow admin to reassign class when updating; ensure classes loaded
    if (!classes || classes.length === 0) {
      try {
        const classesResponse = await api.getClasses();
        setClasses(classesResponse.data);
        setFilteredClasses(classesResponse.data);
      } catch (err) {
        console.error('Failed to load classes for update dialog', err);
        setFilteredClasses([]);
      }
    } else {
      setFilteredClasses(classes);
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      // 檢查必填欄位
      if (!studentForm.name || !studentForm.birthday || !studentForm.gender) {
        setError("請填寫所有必填欄位");
        return;
      }
      
      // 新增學生與轉入學生都必須選擇班級
      if ((dialogMode === 'new' || dialogMode === 'transfer') && !studentForm.classId) {
        setError("請選擇班級");
        return;
      }
      
      let studentId;
      
      if (currentStudent) {
        // 更新學生狀態
        await api.updateStudent(currentStudent.id, studentForm);
        studentId = currentStudent.id;
      } else {
        // 新增學生
        const response = await api.createStudent(studentForm);
        studentId = response.data.id;
      }
      
      // 如果有選擇班級且是新增或轉入狀態，創建班級註冊
      if (studentForm.classId && (dialogMode === 'new' || dialogMode === 'transfer')) {
        // 獲取當前活躍學年
        const academicYearsResponse = await api.getAcademicYears();
        const activeYear = academicYearsResponse.data.find((y: any) => y.isActive);
        
        if (activeYear) {
          // 創建學生的班級註冊
          await api.createStudentEnrollment({
            studentId: studentId,
            classId: studentForm.classId,
            schoolYear: activeYear.year,
            gradeId: studentForm.gradeId || undefined,
          });
        } else {
          setError("無法創建班級註冊：找不到活躍學年");
        }
      }
      
      // 重新獲取學生列表
      const response = await api.getStudents({ status: filterStatus !== 'all' ? filterStatus : undefined });
      setStudents(response.data);
      setDialogOpen(false);
      setError(null);
    } catch (err) {
      setError("提交失敗");
      console.error(err);
    }
  };

  const formatStatus = (status: string) => {
    const statusMap: { [key: string]: string } = {
      active: '在學',
      transferred_out: '轉出',
      graduated: '畢業',
      suspended: '休學'
    };
    return statusMap[status] || status;
  };
  
  const formatGender = (gender: string) => {
    const genderMap: { [key: string]: string } = {
      male: '男',
      female: '女',
      other: '其他'
    };
    return genderMap[gender] || gender;
  };

  const renderStudentsTable = () => {
    const filteredStudents = filterStatus === 'all' ? 
      students : 
      students.filter(s => s.status === filterStatus);
      
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>學號</TableCell>
              <TableCell>姓名</TableCell>
              <TableCell>班級</TableCell>
              <TableCell>生日</TableCell>
              <TableCell>性別</TableCell>
              <TableCell>入學日期</TableCell>
              <TableCell>狀態</TableCell>
              <TableCell>離校日期</TableCell>
              <TableCell>離校原因</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStudents.map((student) => (
              <TableRow key={student.id}>
                <TableCell>{student.studentId}</TableCell>
                <TableCell>{student.name}</TableCell>
                <TableCell>
                  {student.enrollments && Array.isArray(student.enrollments) && student.enrollments.length > 0 && student.enrollments[0].classId ? 
                    classes.find(c => c.id === student.enrollments[0].classId)?.name || '-' : 
                    '-'}
                </TableCell>
                <TableCell>{student.birthday}</TableCell>
                <TableCell>{formatGender(student.gender)}</TableCell>
                <TableCell>{student.enrollmentDate}</TableCell>
                <TableCell>{formatStatus(student.status)}</TableCell>
                <TableCell>{student.departureDate || '-'}</TableCell>
                <TableCell>{student.departureReason || '-'}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => openUpdateStatusDialog(student)}>
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6" component="h2">學生轉入/轉出管理</Typography>
        <Box>
          <Button 
            variant="outlined" 
            onClick={openTransferDialog}
            sx={{ mr: 1 }}
          >
            轉入學生
          </Button>
          <Button 
            variant="contained" 
            onClick={openAddDialog}
          >
            新增學生
          </Button>
        </Box>
      </Box>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Box sx={{ mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>篩選狀態</InputLabel>
          <Select
            value={filterStatus}
            label="篩選狀態"
            onChange={handleFilterStatusChange}
          >
            <MenuItem value="all">全部學生</MenuItem>
            <MenuItem value="active">在學</MenuItem>
            <MenuItem value="transferred_out">轉出</MenuItem>
            <MenuItem value="graduated">畢業</MenuItem>
            <MenuItem value="suspended">休學</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      {renderStudentsTable()}
      
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {currentStudent 
            ? `更新學生狀態: ${currentStudent.name}` 
            : dialogMode === 'transfer' 
              ? '轉入學生' 
              : '新增學生'}
        </DialogTitle>
        <DialogContent>
          <Box 
            sx={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: 2,
              mt: 1
            }}
          >
            <Box sx={{ gridColumn: 'span 6' }}>
                <FormControl fullWidth>
                <InputLabel>年級</InputLabel>
                <Select
                  name="gradeId"
                  value={studentForm.gradeId ? studentForm.gradeId.toString() : ''}
                  label="年級"
                  onChange={(e) => setStudentForm({ ...studentForm, gradeId: Number(e.target.value) })}
                  // allow editing grade for both new and update dialogs
                >
                  {grades.map(g => (
                    <MenuItem key={g.id} value={g.id}>{gradeNameToLabel(g.name)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ gridColumn: 'span 6' }}>
              <TextField
                fullWidth
                label="姓名"
                name="name"
                value={studentForm.name}
                onChange={handleFormChange}
                disabled={!!currentStudent}
              />
            </Box>
            <Box sx={{ gridColumn: 'span 6' }}>
              <TextField
                fullWidth
                label="生日"
                name="birthday"
                type="date"
                value={studentForm.birthday}
                onChange={handleFormChange}
                InputLabelProps={{ shrink: true }}
                disabled={!!currentStudent}
              />
            </Box>
            <Box sx={{ gridColumn: 'span 6' }}>
              <FormControl fullWidth disabled={!!currentStudent}>
                <InputLabel>性別</InputLabel>
                <Select
                  name="gender"
                  value={studentForm.gender}
                  label="性別"
                  onChange={handleSelectChange}
                >
                  <MenuItem value="male">男</MenuItem>
                  <MenuItem value="female">女</MenuItem>
                  <MenuItem value="other">其他</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ gridColumn: 'span 6' }}>
              <FormControl fullWidth>
                <InputLabel>狀態</InputLabel>
                <Select
                  name="status"
                  value={studentForm.status}
                  label="狀態"
                  onChange={handleSelectChange}
                >
                  <MenuItem value="active">在學</MenuItem>
                  <MenuItem value="transferred_out">轉出</MenuItem>
                  <MenuItem value="graduated">畢業</MenuItem>
                  <MenuItem value="suspended">休學</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ gridColumn: 'span 6' }}>
              <TextField
                fullWidth
                label="入學日期"
                name="enrollmentDate"
                type="date"
                value={studentForm.enrollmentDate}
                onChange={handleFormChange}
                InputLabelProps={{ shrink: true }}
                disabled={!!currentStudent}
              />
            </Box>
            {(dialogMode === 'new' || dialogMode === 'transfer' || dialogMode === 'update') && (
              <Box sx={{ gridColumn: 'span 12' }}>
                <FormControl fullWidth>
                  <InputLabel>班級</InputLabel>
                  <Select
                    name="classId"
                    value={studentForm.classId.toString()}
                    label="班級"
                    disabled={dialogMode === 'new' && filteredClasses.length === 1}
                    onChange={(e) => {
                      setStudentForm({
                        ...studentForm,
                        classId: Number(e.target.value)
                      });
                    }}
                  >
                    {filteredClasses.map((cls) => (
                      <MenuItem key={cls.id} value={cls.id}>{cls.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
            {(studentForm.status !== 'active' || currentStudent) && (
              <>
                <Box sx={{ gridColumn: 'span 6' }}>
                  <TextField
                    fullWidth
                    label="離校日期"
                    name="departureDate"
                    type="date"
                    value={studentForm.departureDate || ''}
                    onChange={handleFormChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
                <Box sx={{ gridColumn: 'span 6' }}>
                  <TextField
                    fullWidth
                    label="離校原因"
                    name="departureReason"
                    value={studentForm.departureReason || ''}
                    onChange={handleFormChange}
                  />
                </Box>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button onClick={handleSubmit} variant="contained">提交</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentManagementTab;