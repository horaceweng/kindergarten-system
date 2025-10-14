// in frontend/src/pages/ReportPage.tsx --- FINAL, COMPLETE, AND CORRECTED

import React, { useState, useEffect } from 'react';
import { Box, Button, FormControl, InputLabel, MenuItem, Select, TextField, Typography, CircularProgress, Alert, Paper, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Chip, OutlinedInput, Checkbox, ListItemText, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import * as api from '../services/api';
import { getUserRole } from '../services/auth'; // Import getUserRole

const getTodayString = () => new Date().toISOString().split('T')[0];
// class options are loaded from the backend
const STATUS_OPTIONS = ['present', 'absent', 'late', 'leave_early', 'on_leave'];

const formatStatus = (status: string, leaveTypeName: string | null, leaveStatus: string | null = null) => {
    if (status === 'on_leave' && leaveTypeName) {
        let statusText = `請假 (${leaveTypeName})`;
        if (leaveStatus) {
            const leaveStatusMap: { [key: string]: string } = { 
                pending: '待審核', 
                approved: '已核准', 
                rejected: '已駁回' 
            };
            statusText += ` - ${leaveStatusMap[leaveStatus] || leaveStatus}`;
        }
        return statusText;
    }
    const statusMap: { [key: string]: string } = { present: '出席', absent: '缺席', late: '遲到', leave_early: '早退' };
    return statusMap[status] || status;
}

export const ReportPage: React.FC = () => {
    const [reportType, setReportType] = useState('attendance');
    const [filters, setFilters] = useState({
        startDate: getTodayString(),
        endDate: getTodayString(),
        classIds: [] as string[],
        status: '' as string, // single-select status
        ageFilter: 'all',
    });
    const [classes, setClasses] = React.useState<{id:number,name:string}[]>([]);
    const [reportData, setReportData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isReportGenerated, setIsReportGenerated] = useState(false); // 用來追蹤是否已點擊過產生報表
    const [userRole, setUserRole] = useState<string | null>(null);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [currentLeaveId, setCurrentLeaveId] = useState<number | null>(null);

    useEffect(() => {
        setUserRole(getUserRole());
        // fetch classes for the class dropdown
        const fetchClasses = async () => {
            try {
                const res = await api.getClasses();
                setClasses(res.data || []);
            } catch (err) {
                console.error('載入班級失敗', err);
            }
        };
        fetchClasses();
    }, []);

    const handleTextFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (event: SelectChangeEvent) => {
        const { name, value } = event.target;
        setFilters(prev => ({ ...prev, [name!]: value }));
    };

    const handleClassChange = (event: SelectChangeEvent<string[]>) => {
        const { value } = event.target;
        const newVals = typeof value === 'string' ? value.split(',') : value;

        if (newVals.includes('all')) {
            setFilters(prev => ({ ...prev, classIds: filters.classIds.length === classes.length ? [] : classes.map(c => String(c.id)) }));
        } else {
            setFilters(prev => ({ ...prev, classIds: newVals }));
        }
    };
    
    const handleStatusChangeSingle = (event: SelectChangeEvent) => {
        const { value } = event.target;
        setFilters(prev => ({ ...prev, status: value }));
    };

    const handleApproveLeave = async (leaveId: number) => {
        try {
            await api.approveLeaveRequest(leaveId);
            // Refresh the report data
            generateReport();
        } catch (err) {
            setError('核准假單失敗');
            console.error("Approve leave failed:", err);
        }
    };

    const handleRejectLeave = (leaveId: number) => {
        setCurrentLeaveId(leaveId);
        setRejectionReason('');
        setRejectDialogOpen(true);
    };

    const handleRejectConfirm = async () => {
        if (currentLeaveId === null) return;
        
        try {
            await api.rejectLeaveRequest(currentLeaveId, rejectionReason);
            setRejectDialogOpen(false);
            // Refresh the report data
            generateReport();
        } catch (err) {
            setError('駁回假單失敗');
            console.error("Reject leave failed:", err);
        }
    };

    const handleRejectCancel = () => {
        setRejectDialogOpen(false);
        setCurrentLeaveId(null);
    };

    const generateReport = async () => {
        setLoading(true);
        setError('');
        setReportData([]);
        setIsReportGenerated(true); // 標記已產生過報表
        
        try {
            let res;
            const classParams = (filters.classIds.length === 0 || filters.classIds.length === classes.length)
                ? {}
                : { classIds: filters.classIds };

            if (reportType === 'attendance') {
                const apiParams: any = { startDate: filters.startDate, endDate: filters.endDate, ...classParams };
                if (filters.status) apiParams.statuses = [filters.status];
                res = await api.getAttendanceReport(apiParams);
            } else if (reportType === 'pending_leave') {
                const apiParams = { ageFilter: filters.ageFilter === 'all' ? undefined : filters.ageFilter, ...classParams };
                res = await api.getPendingLeavesReport(apiParams);
            } else if (reportType === 'unresolved_absence') {
                res = await api.getUnresolvedAbsencesReport(classParams);
            }
            setReportData(res?.data || []);
        } catch (err: any) {
            setError('產生報表失敗');
            console.error("API 請求失敗:", err.response?.data || err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const ClassFilter = () => (
        <FormControl fullWidth>
            <InputLabel>班級</InputLabel>
            <Select name="classIds" multiple value={filters.classIds} onChange={handleClassChange}
                input={<OutlinedInput label="班級" />}
                renderValue={(selected) => {
                    if (!classes || classes.length === 0) return '無班級資料';
                    if (selected.length === classes.length || selected.length === 0) return '全部班級';
                    return (selected as string[]).map(id => classes.find(c => String(c.id) === id)?.name || id).join(', ');
                }}>
                <MenuItem value="all"><Checkbox checked={filters.classIds.length === classes.length} indeterminate={filters.classIds.length > 0 && filters.classIds.length < classes.length} /><ListItemText primary="全部班級" /></MenuItem>
                {classes.map(cls => (<MenuItem key={cls.id} value={String(cls.id)}><Checkbox checked={filters.classIds.indexOf(String(cls.id)) > -1} /><ListItemText primary={cls.name} /></MenuItem>))}
            </Select>
        </FormControl>
    );

    const renderAttendanceReportTable = () => (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>日期</TableCell>
                        <TableCell>班級</TableCell>
                        <TableCell>學生姓名</TableCell>
                        <TableCell>狀態</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {reportData.map((row) => (
                        <TableRow key={row.id}>
                            <TableCell>{row.date}</TableCell>
                            <TableCell>{row.className}</TableCell>
                            <TableCell>{row.studentName}</TableCell>
                            <TableCell>
                                <Chip 
                                    label={formatStatus(row.status, row.leaveTypeName, row.leaveStatus)} 
                                    size="small"
                                    color={row.status === 'on_leave' ? 
                                        (row.leaveStatus === 'approved' ? 'success' : 
                                         row.leaveStatus === 'pending' ? 'warning' : 'default')
                                        : 'default'
                                    }
                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
    const renderPendingLeaveReportTable = () => (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>申請日</TableCell>
                        <TableCell>學生</TableCell>
                        <TableCell>假別</TableCell>
                        <TableCell>請假起日</TableCell>
                        <TableCell>請假迄日</TableCell>
                        {userRole === 'GA_specialist' && <TableCell>操作</TableCell>}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {reportData.map((row) => (
                        <TableRow key={row.id}>
                            <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>{row.student.name}</TableCell>
                            <TableCell>{row.leaveType.name}</TableCell>
                            <TableCell>{new Date(row.startDate).toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(row.endDate).toLocaleDateString()}</TableCell>
                            {userRole === 'GA_specialist' && (
                                <TableCell>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            size="small"
                                            onClick={() => handleApproveLeave(row.id)}
                                        >
                                            核准
                                        </Button>
                                        <Button
                                            variant="contained"
                                            color="error"
                                            size="small"
                                            onClick={() => handleRejectLeave(row.id)}
                                        >
                                            駁回
                                        </Button>
                                    </Box>
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
    const renderUnresolvedAbsenceReportTable = () => (<TableContainer component={Paper}><Table><TableHead><TableRow><TableCell>缺席日期</TableCell><TableCell>班級</TableCell><TableCell>學生姓名</TableCell></TableRow></TableHead><TableBody>{reportData.map((row) => (<TableRow key={row.id}><TableCell>{new Date(row.attendanceDate).toLocaleDateString()}</TableCell><TableCell>{row.class.name}</TableCell><TableCell>{row.student.name}</TableCell></TableRow>))}</TableBody></Table></TableContainer>);

    // 【新增】這就是我們遺漏的總渲染函式
    const renderReportContent = () => {
        if (!isReportGenerated) return null; // 如果還沒點過按鈕，什麼都不顯示
        if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
        if (reportData.length === 0) return <Alert severity="info" sx={{mt: 2}}>查無資料</Alert>;

        switch (reportType) {
            case 'attendance': return renderAttendanceReportTable();
            case 'pending_leave': return renderPendingLeaveReportTable();
            case 'unresolved_absence': return renderUnresolvedAbsenceReportTable();
            default: return null;
        }
    };
    
    return (
        <Box sx={{ mt: 3, maxWidth: 1000, mx: 'auto' }}>
            <Typography variant="h4" gutterBottom>出缺勤報表系統</Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>報表類型</InputLabel>
                    <Select value={reportType} label="報表類型" onChange={(e: SelectChangeEvent) => { setReportType(e.target.value); setReportData([]); setIsReportGenerated(false); }}>
                        <MenuItem value="attendance">出缺勤總表</MenuItem>
                        <MenuItem value="pending_leave">待審核假單</MenuItem>
                        <MenuItem value="unresolved_absence">曠缺待處理</MenuItem>
                    </Select>
                </FormControl>
                <Button onClick={generateReport} variant="contained" disabled={loading} size="large">
                    {loading ? <CircularProgress size={24} /> : '產生報表'}
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{mb: 2}}>{error}</Alert>}
            
            {/* 篩選器區域 */}
            {reportType === 'attendance' && (
                <Paper sx={{p: 2, mb: 3}}>
                    <Box sx={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2}}>
                        <TextField name="startDate" label="開始日期" type="date" value={filters.startDate} onChange={handleTextFieldChange} InputLabelProps={{shrink: true}}/>
                        <TextField name="endDate" label="結束日期" type="date" value={filters.endDate} onChange={handleTextFieldChange} InputLabelProps={{shrink: true}}/>
                        <ClassFilter/>
                        <FormControl fullWidth>
                            <InputLabel>出勤狀況</InputLabel>
                            <Select name="status" value={filters.status} onChange={handleStatusChangeSingle} input={<OutlinedInput label="出勤狀況" />}>
                                <MenuItem value="">(全部)</MenuItem>
                                {STATUS_OPTIONS.map(status => (<MenuItem key={status} value={status}>{formatStatus(status, null)}</MenuItem>))}
                            </Select>
                        </FormControl>
                    </Box>
                </Paper>
            )}
            {reportType === 'pending_leave' && <Paper sx={{p: 2, mb: 3}}><Box sx={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2}}><ClassFilter /><FormControl fullWidth><InputLabel>假單建立時間</InputLabel><Select name="ageFilter" value={filters.ageFilter} label="假單建立時間" onChange={handleSelectChange}><MenuItem value="all">全部</MenuItem><MenuItem value="within_3_days">三日內</MenuItem><MenuItem value="over_3_days">大於三日</MenuItem></Select></FormControl></Box></Paper>}
            {reportType === 'unresolved_absence' && <Paper sx={{p: 2, mb: 3}}><Box sx={{display: 'grid', gridTemplateColumns: '1fr', gap: 2}}><ClassFilter /></Box></Paper>}
            
            {/* 【修正】結果區域，統一呼叫 renderReportContent */}
            {renderReportContent()}

            {/* 駁回假單對話框 */}
            <Dialog open={rejectDialogOpen} onClose={handleRejectCancel}>
                <DialogTitle>駁回假單</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        請輸入駁回原因（選填）：
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="駁回原因"
                        fullWidth
                        multiline
                        rows={4}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleRejectCancel}>取消</Button>
                    <Button onClick={handleRejectConfirm} color="error">駁回</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};