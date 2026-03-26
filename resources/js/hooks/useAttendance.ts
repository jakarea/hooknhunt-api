import { useState, useEffect } from 'react'
import api from '@/lib/api'

interface Attendance {
  id: number
  user_id: number
  date: string
  clock_in: string
  clock_out?: string | null
  break_in?: string[]
  break_out?: string[]
  status: string
  note?: string | null
}

export function useAttendance(userId: number | undefined, token: string | null) {
  const [attendance, setAttendance] = useState<Attendance | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!userId || !token) {
        setLoading(false)
        return
      }

      try {
        const today = new Date().toISOString().split('T')[0]
        const response = await api.get(`/hrm/attendance?start_date=${today}&end_date=${today}`)

        let attendanceData = []
        if (response.data?.data?.data) {
          attendanceData = response.data.data.data
        } else if (response.data?.data) {
          attendanceData = Array.isArray(response.data.data) ? response.data.data : []
        }

        const myRecord = attendanceData.find((a: any) => a.userId === userId || a.user_id === userId)

        if (myRecord) {
          setAttendance({
            id: myRecord.id,
            user_id: myRecord.userId || myRecord.user_id,
            date: myRecord.date,
            clock_in: myRecord.clockIn || myRecord.clock_in,
            clock_out: myRecord.clockOut || myRecord.clock_out,
            break_in: myRecord.breakIn || myRecord.break_in,
            break_out: myRecord.breakOut || myRecord.break_out,
            status: myRecord.status,
            note: myRecord.note,
          })
        }
      } catch (error) {
      } finally {
        setLoading(false)
      }
    }

    fetchAttendance()
  }, [userId, token])

  return { attendance, loading }
}
